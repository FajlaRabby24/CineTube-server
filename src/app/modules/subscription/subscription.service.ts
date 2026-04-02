import status from "http-status";
import Stripe from "stripe";
import {
  PaymentStatus,
  SubscriptionPlan,
  SubscriptionStatus,
} from "../../../generated/prisma/client";
import { envVars } from "../../config/env.js";
import AppError from "../../errorhandlers/AppError.js";
import { prisma } from "../../lib/prisma.js";

import { stripe } from "../../config/stripe.config.js";

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
    throw new AppError(status.BAD_REQUEST, "Cannot checkout for FREE plan");
  }

  const pricingPlan = await prisma.pricingPlan.findUnique({
    where: { plan },
  });

  if (!pricingPlan || !pricingPlan.stripePriceId) {
    throw new AppError(status.NOT_FOUND, "Pricing plan not found");
  }

  let subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  let customerId = subscription?.stripeCustomerId;

  if (!customerId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.email) {
      throw new AppError(status.BAD_REQUEST, "User email not found");
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
          currentPeriodEnd: new Date(),
        },
      });
    }
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [
      {
        price: pricingPlan.stripePriceId,
        quantity: 1,
      },
    ],
    success_url: `${envVars.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${envVars.FRONTEND_URL}/subscription/cancel`,
    metadata: { userId, plan },
  });

  return { sessionId: session.id, url: session.url };
};

const cancelSubscription = async (userId: string) => {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription?.stripeSubscriptionId) {
    throw new AppError(status.NOT_FOUND, "Subscription not found");
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(
    subscription.stripeSubscriptionId,
  );

  if (stripeSubscription.status === "canceled") {
    throw new AppError(status.BAD_REQUEST, "Subscription already cancelled");
  }

  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  const updated = await prisma.subscription.update({
    where: { userId },
    data: { cancelAtPeriodEnd: true },
  });

  return updated;
};

const handleWebhookEvent = async (event: Stripe.Event) => {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan as SubscriptionPlan;

      if (!userId || !plan) break;

      const stripeSubResponse = await stripe.subscriptions.retrieve(
        session.subscription as string,
      );
      const stripeSubscriptionData = stripeSubResponse as any;

      const priceId = stripeSubscriptionData.items.data[0]?.price.id;

      const periodStart = new Date(
        stripeSubscriptionData.current_period_start * 1000,
      );
      const periodEnd = new Date(
        stripeSubscriptionData.current_period_end * 1000,
      );

      await prisma.$transaction(async (tx) => {
        await tx.subscription.update({
          where: { userId },
          data: {
            plan,
            status: SubscriptionStatus.ACTIVE,
            stripeSubscriptionId: stripeSubscriptionData.id,
            stripePriceId: priceId ?? null,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
          },
        });

        await tx.payment.create({
          data: {
            userId,
            stripePaymentIntentId: session.payment_intent as string,
            amount: session.amount_total ? session.amount_total / 100 : 0,
            currency: session.currency || "usd",
            status: PaymentStatus.SUCCEEDED,
            plan,
            description: `${plan} subscription`,
          },
        });
      });
      break;
    }

    case "customer.subscription.updated": {
      const stripeSubscription = event.data.object as any;
      const periodStart = new Date(
        stripeSubscription.current_period_start * 1000,
      );
      const periodEnd = new Date(stripeSubscription.current_period_end * 1000);

      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: stripeSubscription.id },
        data: {
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          status:
            stripeSubscription.status === "active"
              ? SubscriptionStatus.ACTIVE
              : SubscriptionStatus.PAST_DUE,
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const stripeSubscription = event.data.object as Stripe.Subscription;
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: stripeSubscription.id },
        data: { status: SubscriptionStatus.CANCELLED },
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      await prisma.subscription.updateMany({
        where: { stripeCustomerId: customerId },
        data: { status: SubscriptionStatus.PAST_DUE },
      });
      break;
    }
  }
};

export const SubscriptionService = {
  getUserSubscriptionFromDB,
  createCheckoutSession,
  cancelSubscription,
  handleWebhookEvent,
};
