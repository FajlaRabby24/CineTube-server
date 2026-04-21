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

// Helper: Calculate subscription period end based on plan
const calculatePeriodEnd = (plan: SubscriptionPlan): Date => {
  const now = new Date();
  if (plan === SubscriptionPlan.YEARLY) {
    return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  }
  if (plan === SubscriptionPlan.MONTHLY) {
    return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }
  return now;
};

const handleWebhookEvent = async (event: Stripe.Event) => {
  // console.log({ eventType: event.type });
  switch (event.type) {
    case "checkout.session.completed": {
      try {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan as SubscriptionPlan;

        if (!userId || !plan) break;

        const subscriptionId = session.subscription as string;
        if (!subscriptionId) break;

        const stripeSubRaw =
          await stripe.subscriptions.retrieve(subscriptionId);

        const now = new Date();
        const periodEnd = calculatePeriodEnd(plan);

        console.log(
          `[Webhook] checkout.session.completed — plan: ${plan}, periodEnd: ${periodEnd.toISOString()}`,
        );

        const updatedSub = await prisma.subscription.update({
          where: { userId },
          data: {
            plan,
            status: SubscriptionStatus.ACTIVE,
            stripeSubscriptionId: stripeSubRaw.id,
            stripePriceId:
              (stripeSubRaw as any).items?.data?.[0]?.price?.id ?? null,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
            cancelledAt: null,
          },
          include: { user: true },
        });

        // Add subscription activation notification
        await prisma.notification.create({
          data: {
            userId,
            type: "SUBSCRIPTION_ACTIVATED" as any,
            title: "Premium Tier Activated",
            message: `Welcome to the ${plan} Tier. Your cinematic journey begins now.`,
            link: "/dashboard/subscriptions",
          },
        });

        const invoiceId = session.invoice as string;
        if (invoiceId) {
          const alreadyProcessed = await prisma.payment.findFirst({
            where: { stripeInvoiceId: invoiceId },
          });

          if (!alreadyProcessed) {
            await prisma.payment.create({
              data: {
                userId,
                subscriptionId: updatedSub.id,
                stripeInvoiceId: invoiceId,
                amount: session.amount_total ? session.amount_total / 100 : 0,
                currency: session.currency ?? "usd",
                status: PaymentStatus.SUCCEEDED,
                plan,
                description: `${plan} subscription activated`,
              },
            });

            if (updatedSub.user?.email) {
              await sendEmail({
                to: updatedSub.user.email,
                subject: "Your CineTube Receipt",
                templateName: "subscription-receipt",
                templateData: {
                  userName: updatedSub.user.name || "Customer",
                  email: updatedSub.user.email,
                  totalBill: `${(session.amount_total ? session.amount_total / 100 : 0).toFixed(2)} ${(session.currency ?? "usd").toUpperCase()}`,
                  customerId: session.customer as string,
                  planName: plan,
                  date: new Date().toLocaleDateString(),
                  envVars,
                },
              }).catch((err) => console.error("Email send error:", err));
            }
          }
        }

        console.log(
          `Subscription ${stripeSubRaw.id} activated for user ${userId}`,
        );
      } catch (error) {
        console.error("Webhook (session.completed) error:", error);
      }
      break;
    }

    case "invoice.payment_succeeded": {
      try {
        console.log("start of invoice.payment_succeeded");
        const invoice = event.data.object as Stripe.Invoice;
        let stripeSubscriptionId =
          typeof (invoice as any).subscription === "string"
            ? (invoice as any).subscription
            : (invoice as any).subscription?.id;

        // Fallback: Check invoice lines if root subscription is missing
        if (!stripeSubscriptionId && invoice.lines?.data?.[0]) {
          stripeSubscriptionId = (invoice.lines.data[0] as any).subscription;
          if (stripeSubscriptionId) {
            console.log(
              `[Webhook] Found subscription ID in invoice lines: ${stripeSubscriptionId}`,
            );
          }
        }

        const stripeCustomerId =
          typeof (invoice as any).customer === "string"
            ? (invoice as any).customer
            : (invoice as any).customer?.id;

        console.log(`[Webhook] Processing invoice: ${invoice.id}`, {
          stripeSubscriptionId,
          stripeCustomerId,
        });

        const alreadyProcessed = await prisma.payment.findFirst({
          where: { stripeInvoiceId: invoice.id },
        });
        if (alreadyProcessed) {
          console.log(`Invoice ${invoice.id} already processed. Skipping`);
          break;
        }

        let subscription = await prisma.subscription.findFirst({
          where: stripeSubscriptionId
            ? { stripeSubscriptionId }
            : { id: "none" },
        });

        // Fallback: If subscription ID isn't found or missing, find by customer ID
        if (!subscription && stripeCustomerId) {
          console.log(
            `[Webhook] Subscription ID missing or not matched. Trying Customer ID fallback: ${stripeCustomerId}`,
          );
          subscription = await prisma.subscription.findFirst({
            where: { stripeCustomerId },
          });
        }

        if (!subscription) {
          console.warn(
            `[Webhook] No subscription record found for invoice ${invoice.id}. Skipping.`,
          );
          break;
        }

        // If we found it via customer but had no ID from invoice, use the one from DB
        const finalSubscriptionId =
          stripeSubscriptionId || subscription.stripeSubscriptionId;

        if (!finalSubscriptionId) {
          console.warn(
            `[Webhook] Could not determine subscription ID for invoice ${invoice.id}. skipping.`,
          );
          break;
        }

        const renewalEnd = calculatePeriodEnd(subscription.plan);

        console.log(
          `[Webhook] invoice.payment_succeeded — plan: ${subscription.plan}, renewalEnd: ${renewalEnd.toISOString()}`,
        );

        await prisma.$transaction(async (tx) => {
          await tx.subscription.update({
            where: { id: subscription.id },
            data: {
              status: SubscriptionStatus.ACTIVE,
              stripeSubscriptionId: finalSubscriptionId,
              currentPeriodStart: new Date(),
              currentPeriodEnd: renewalEnd,
              cancelAtPeriodEnd: false,
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

          // Add payment success notification
          await tx.notification.create({
            data: {
              userId: subscription.userId,
              type: "PAYMENT_SUCCEEDED" as any,
              title: "Payment Encrypted",
              message: `Your ${subscription.plan} billing was processed successfully.`,
              link: "/dashboard/subscriptions",
            },
          });

          console.log(`Payment record created for invoice ${invoice.id}`);

          // Send receipt email
          const user = await tx.user.findUnique({
            where: { id: subscription.userId },
          });
          if (user?.email) {
            await sendEmail({
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
        console.log(`Invoice ${invoice.id} processed successfully`);
        console.log("end of invoice.payment_succeeded");
        break;
      } catch (error) {
        console.error("Webhook (invoice.payment_succeeded) error:", error);
      }
      break;
    }

    //
    case "invoice.payment_failed": {
      try {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeSubscriptionId =
          typeof (invoice as any).subscription === "string"
            ? (invoice as any).subscription
            : (invoice as any).subscription?.id;

        if (!stripeSubscriptionId) {
          console.warn(
            `[Webhook] Failed invoice ${invoice.id} has no subscription ID. Skipping.`,
          );
          break;
        }

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

          // Add payment failure notification
          await tx.notification.create({
            data: {
              userId: subscription.userId,
              type: "PAYMENT_FAILED" as any,
              title: "Billing Transmission Fault",
              message: `The transaction for your ${subscription.plan} tier encountered an error.`,
              link: "/dashboard/subscriptions",
            },
          });
        });
        break;
      } catch (error) {
        console.error("Webhook (invoice.payment_failed) error:", error);
      }
      break;
    }

    case "customer.subscription.updated": {
      try {
        const subEvent = event.data.object as any;

        const subscription = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: subEvent.id },
          include: {
            user: true,
          },
        });
        if (!subscription) break;

        const subCanceledAt = subEvent.canceled_at || subEvent.canceledAt;

        let newStatus: SubscriptionStatus;
        switch (subEvent.status) {
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

        console.log(
          `[Webhook] subscription.updated — status: ${subEvent.status}`,
        );

        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: newStatus,
            cancelAtPeriodEnd: subEvent.cancel_at_period_end ?? false,
            cancelledAt: subCanceledAt ? new Date(subCanceledAt * 1000) : null,
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
        console.error("Webhook (subscription.updated) error:", error);
      }
      break;
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
        console.error("Webhook (subscription.deleted) error:", error);
      }
      break;
    }

    default:
    // console.log(`Unhandled event type: ${event.type}`);
  }
};
export const SubscriptionService = {
  getUserSubscriptionFromDB,
  createCheckoutSession,
  cancelSubscription,
  createCustomerPortalSession,
  handleWebhookEvent,
};
