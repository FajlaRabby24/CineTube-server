import httpStatus from "http-status";
import Stripe from "stripe";
import {
  PaymentStatus,
  SubscriptionPlan,
  SubscriptionStatus,
} from "../../../generated/prisma/client";
import { envVars } from "../../config/env.js";
import { stripe } from "../../config/stripe.config";
import AppError from "../../errorhandlers/AppError.js";
import { prisma } from "../../lib/prisma.js";
import { sendEmail } from "../../utils/email";

const getUserSubscriptionFromDB = async (userId: string) => {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    include: {
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return subscription;
};

const createCheckoutSession = async (
  userId: string,
  plan: SubscriptionPlan,
) => {
  if (plan === SubscriptionPlan.FREE) {
    throw new AppError(httpStatus.BAD_REQUEST, "Cannot checkout for FREE plan");
  }

  const pricingPlan = await prisma.pricingPlan.findUnique({
    where: { plan },
  });

  if (!pricingPlan || !pricingPlan.stripePriceId) {
    throw new AppError(httpStatus.NOT_FOUND, "Pricing plan not found");
  }

  let subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (subscription && subscription.plan !== SubscriptionPlan.FREE) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `You already have an active ${subscription.plan} plan. Use Manage Subscription to change it.`,
    );
  }

  let customerId = subscription?.stripeCustomerId;

  if (customerId) {
    try {
      // Verify if the customer actually exists in the current Stripe account
      await stripe.customers.retrieve(customerId);
    } catch (error: any) {
      if (error.code === "resource_missing") {
        // Customer was likely deleted from Stripe or we switched Stripe accounts
        customerId = undefined;
        await prisma.subscription.update({
          where: { userId },
          data: { stripeCustomerId: null },
        });
      } else {
        throw error;
      }
    }
  }

  if (!customerId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.email) {
      throw new AppError(httpStatus.BAD_REQUEST, "User email not found");
    }

    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId },
    });
    customerId = customer.id;

    if (subscription) {
      await prisma.subscription.update({
        where: { userId },
        data: { stripeCustomerId: customerId },
      });
    } else {
      await prisma.subscription.create({
        data: {
          userId,
          plan: SubscriptionPlan.FREE,
          status: SubscriptionStatus.ACTIVE,
          stripeCustomerId: customerId,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(), // webhook এ overwrite হবে, তাই ঠিক আছে
        },
      });
    }
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    customer: customerId,
    mode: "subscription",
    line_items: [
      {
        price: pricingPlan.stripePriceId,
        quantity: 1,
      },
    ],
    success_url: `${envVars.FRONTEND_URL}/dashboard/payments/success`,
    cancel_url: `${envVars.FRONTEND_URL}/dashboard/payments/cancel`,
    metadata: { userId, plan },
    subscription_data: {
      metadata: { userId, plan },
    },
  });

  return { sessionId: session.id, paymentUrl: session.url };
};

const cancelSubscription = async (userId: string) => {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription?.stripeSubscriptionId) {
    throw new AppError(httpStatus.NOT_FOUND, "Subscription not found");
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(
    subscription.stripeSubscriptionId,
  );

  if (stripeSubscription.status === "canceled") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Subscription already cancelled",
    );
  }

  if (stripeSubscription.cancel_at_period_end) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Subscription is already set to cancel at period end",
    );
  }

  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  const updated = await prisma.subscription.update({
    where: { userId },
    data: {
      status: SubscriptionStatus.CANCELLED,
      cancelAtPeriodEnd: true,
      cancelledAt: new Date(),
    },
    include: { user: true },
  });

  if (updated.user?.email) {
    sendEmail({
      to: updated.user.email,
      subject: "CineTube Subscription Cancelled",
      templateName: "subscription-cancel-notice",
      templateData: {
        userName: updated.user.name || "User",
        expiryDate: updated.currentPeriodEnd.toLocaleDateString(),
        envVars,
      },
    }).catch((err) => console.error("Email send error:", err));
  }

  return updated;
};

const createCustomerPortalSession = async (userId: string) => {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription?.stripeCustomerId) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Stripe customer not found for this user",
    );
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${envVars.FRONTEND_URL}/dashboard/payments/success`,
  });

  return { url: session.url };
};

const handleWebhookEvent = async (event: Stripe.Event) => {
  console.log({ eventType: event.type });
  switch (event.type) {
    case "checkout.session.completed": {
      try {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan as SubscriptionPlan;

        if (!userId || !plan) break;

        const subscriptionId = session.subscription as string;
        if (!subscriptionId) break;

        const stripeSub = (await stripe.subscriptions.retrieve(
          subscriptionId,
        )) as unknown as {
          id: string;
          items: { data: Array<{ price: { id: string } }> };
          current_period_start: number;
          current_period_end: number;
          cancel_at_period_end: boolean;
        };

        await prisma.subscription.update({
          where: { userId },
          data: {
            plan,
            status: SubscriptionStatus.ACTIVE,
            stripeSubscriptionId: stripeSub.id,
            stripePriceId: stripeSub.items.data[0]?.price.id ?? null,
            currentPeriodStart: stripeSub.current_period_start
              ? new Date(stripeSub.current_period_start * 1000)
              : new Date(),
            currentPeriodEnd: stripeSub.current_period_end
              ? new Date(stripeSub.current_period_end * 1000)
              : new Date(),
            cancelAtPeriodEnd: stripeSub.cancel_at_period_end || false,
            cancelledAt: null,
          },
        });

        console.log(
          `Subscription ${stripeSub.id} activated for user ${userId}`,
        );
        break;
      } catch (error) {
        console.error("Webhook (session.completed) error:", error);
      }
      break;
    }

    case "invoice.payment_succeeded": {
      try {
        const invoice = event.data.object as Stripe.Invoice;

        const stripeSubscriptionId = (
          invoice as unknown as { subscription: string }
        ).subscription;
        if (!stripeSubscriptionId) break;

        const alreadyProcessed = await prisma.payment.findFirst({
          where: { stripeInvoiceId: invoice.id },
        });
        if (alreadyProcessed) {
          console.log(`Invoice ${invoice.id} already processed. Skipping`);
          break;
        }

        let subscription = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId },
        });

        // Fallback: If subscription ID isn't linked yet, find by customer ID
        if (!subscription && invoice.customer) {
          subscription = await prisma.subscription.findFirst({
            where: { stripeCustomerId: invoice.customer as string },
          });
        }

        if (!subscription) {
          console.warn(`No subscription found for invoice ${invoice.id}`);
          break;
        }

        const stripeSub = (await stripe.subscriptions.retrieve(
          stripeSubscriptionId,
        )) as unknown as {
          current_period_start: number;
          current_period_end: number;
          cancel_at_period_end: boolean;
        };

        await prisma.$transaction(async (tx) => {
          await tx.subscription.update({
            where: { id: subscription.id },
            data: {
              status: SubscriptionStatus.ACTIVE,
              stripeSubscriptionId: stripeSubscriptionId, // Ensure it's linked
              currentPeriodStart: stripeSub.current_period_start
                ? new Date(stripeSub.current_period_start * 1000)
                : subscription.currentPeriodStart,
              currentPeriodEnd: stripeSub.current_period_end
                ? new Date(stripeSub.current_period_end * 1000)
                : subscription.currentPeriodEnd,
              cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
            },
          });

          await tx.payment.create({
            data: {
              userId: subscription.userId,
              subscriptionId: subscription.id,
              stripeInvoiceId: invoice.id,
              amount: invoice.amount_paid / 100,
              currency: invoice.currency ?? "usd",
              status: PaymentStatus.SUCCEEDED,
              plan: subscription.plan,
              description: `${subscription.plan} subscription renewal`,
            },
          });
          console.log(`Payment record created for invoice ${invoice.id}`);

          // Send receipt email
          const user = await tx.user.findUnique({
            where: { id: subscription.userId },
          });
          if (user?.email) {
            sendEmail({
              to: user.email,
              subject: "Your CineTube Receipt",
              templateName: "subscription-receipt",
              templateData: {
                userName: user.name || "Customer",
                email: user.email,
                totalBill: `${(invoice.amount_paid / 100).toFixed(2)} ${invoice.currency.toUpperCase()}`,
                customerId: invoice.customer as string,
                planName: subscription.plan,
                date: new Date().toLocaleDateString(),
                envVars,
              },
            }).catch((err) => console.error("Email send error:", err));
          }
        });
        break;
      } catch (error) {
        console.error("Webhook (invoice.payment_succeeded) error:", error);
      }
    }

    //
    case "invoice.payment_failed": {
      try {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeSubscriptionId = (
          invoice as unknown as { subscription: string }
        ).subscription;
        if (!stripeSubscriptionId) break;

        const subscription = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId },
        });
        if (!subscription) break;

        await prisma.$transaction(async (tx) => {
          await tx.subscription.update({
            where: { id: subscription.id },
            data: { status: SubscriptionStatus.PAST_DUE },
          });

          await tx.payment.create({
            data: {
              userId: subscription.userId,
              subscriptionId: subscription.id,
              stripeInvoiceId: invoice.id,
              amount: invoice.amount_due / 100,
              currency: invoice.currency ?? "usd",
              status: PaymentStatus.FAILED,
              plan: subscription.plan,
              description: `${subscription.plan} payment failed`,
            },
          });
        });
        break;
      } catch (error) {
        console.log(error);
      }
    }

    case "customer.subscription.updated": {
      try {
        const stripeSub = event.data.object as unknown as {
          id: string;
          status: string;
          current_period_start: number;
          current_period_end: number;
          cancel_at_period_end: boolean;
          canceled_at: number | null;
        };

        const subscription = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: stripeSub.id },
          include: {
            user: true,
          },
        });
        if (!subscription) break;

        let newStatus: SubscriptionStatus;
        switch (stripeSub.status) {
          case "active":
            newStatus = SubscriptionStatus.ACTIVE;
            break;
          case "past_due":
            newStatus = SubscriptionStatus.PAST_DUE;
            break;
          case "canceled":
            newStatus = SubscriptionStatus.CANCELLED;
            break;
          default:
            newStatus = SubscriptionStatus.ACTIVE;
        }

        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: newStatus,
            currentPeriodStart: stripeSub.current_period_start
              ? new Date(stripeSub.current_period_start * 1000)
              : subscription.currentPeriodStart,
            currentPeriodEnd: stripeSub.current_period_end
              ? new Date(stripeSub.current_period_end * 1000)
              : subscription.currentPeriodEnd,
            cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
            cancelledAt: stripeSub.canceled_at
              ? new Date(stripeSub.canceled_at * 1000)
              : null,
          },
          include: { user: true },
        });

        // Send Update Email
        if (subscription.user?.email) {
          sendEmail({
            to: subscription.user.email,
            subject: "CineTube Plan Updated",
            templateName: "subscription-update-notice",
            templateData: {
              userName: subscription.user.name || "User",
              newPlan: subscription.plan,
              date: new Date().toLocaleDateString(),
              envVars,
            },
          }).catch((err) => console.error("Email send error:", err));
        }
        break;
      } catch (error) {
        console.log(error);
      }
    }

    case "customer.subscription.deleted": {
      try {
        const stripeSub = event.data.object as unknown as { id: string };

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: stripeSub.id },
          data: {
            status: SubscriptionStatus.CANCELLED,
            cancelAtPeriodEnd: false,
            cancelledAt: new Date(),
            plan: SubscriptionPlan.FREE,
          },
        });
        break;
      } catch (error) {
        console.log(error);
      }
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
};

export const SubscriptionService = {
  getUserSubscriptionFromDB,
  createCheckoutSession,
  cancelSubscription,
  createCustomerPortalSession,
  handleWebhookEvent,
};
