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

  let customerId = subscription?.stripeCustomerId;

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
    success_url: `${envVars.FRONTEND_URL}/subscription/success`,
    cancel_url: `${envVars.FRONTEND_URL}/subscription/cancel`,
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
      cancelAtPeriodEnd: true,
      cancelledAt: new Date(),
      status: SubscriptionStatus.CANCELLED,
    },
  });

  return updated;
};

const handleWebhookEvent = async (event: Stripe.Event) => {
  switch (event.type) {
    case "checkout.session.completed": {
      try {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan as SubscriptionPlan;

        if (!userId || !plan) break;

        const alreadyProcessed = await prisma.payment.findUnique({
          where: { stripePaymentIntentId: session.payment_intent as string },
        });
        if (alreadyProcessed) {
          console.log(`Session ${session.id} already processed. Skipping`);
          break;
        }

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

        await prisma.$transaction(async (tx) => {
          await tx.subscription.update({
            where: { userId },
            data: {
              plan,
              status: SubscriptionStatus.ACTIVE,
              stripeSubscriptionId: stripeSub.id,
              stripePriceId: stripeSub.items.data[0]?.price.id ?? null,
              currentPeriodStart: new Date(
                stripeSub.current_period_start * 1000,
              ),
              currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
              cancelAtPeriodEnd: false,
              cancelledAt: null,
            },
          });

          await tx.payment.create({
            data: {
              userId,
              stripePaymentIntentId: session.payment_intent as string,
              amount: session.amount_total ? session.amount_total / 100 : 0,
              currency: session.currency ?? "usd",
              status: PaymentStatus.SUCCEEDED,
              plan,
              description: `${plan} subscription`,
            },
          });
        });
        break;
      } catch (error) {
        console.log(error);
      }
    }

    case "invoice.payment_succeeded": {
      try {
        const invoice = event.data.object as Stripe.Invoice;

        if (invoice.billing_reason === "subscription_create") break;

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

        const subscription = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId },
        });
        if (!subscription) break;

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
              currentPeriodStart: new Date(
                stripeSub.current_period_start * 1000,
              ),
              currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
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
        });
        break;
      } catch (error) {
        console.log(error);
      }
    }

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
            currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
            cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
            cancelledAt: stripeSub.canceled_at
              ? new Date(stripeSub.canceled_at * 1000)
              : null,
          },
        });
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
  handleWebhookEvent,
};
