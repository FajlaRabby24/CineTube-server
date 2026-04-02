import { Request, Response } from "express";
import status from "http-status";
import { envVars } from "../../config/env.js";
import { stripe } from "../../config/stripe.config.js";
import { IRequestUser } from "../../interfaces/requestUser.interface.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { SubscriptionService } from "./subscription.service.js";

const getUserSubscription = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as IRequestUser;
  const result = await SubscriptionService.getUserSubscriptionFromDB(userId);

  sendResponse(
    res,
    status.OK,
    true,
    "Subscription retrieved successfully",
    result,
  );
});

const createCheckout = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as IRequestUser;
  const { plan } = req.body;
  const result = await SubscriptionService.createCheckoutSession(userId, plan);

  sendResponse(res, status.OK, true, "Checkout session created", result);
});

const cancelSubscription = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as IRequestUser;
  const result = await SubscriptionService.cancelSubscription(userId);

  sendResponse(res, status.OK, true, "Subscription cancelled", result);
});

const handleWebhook = catchAsync(async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = envVars.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    throw new Error(`Webhook Error: ${err}`);
  }

  await SubscriptionService.handleWebhookEvent(event);

  sendResponse(res, status.OK, true, "Webhook processed", null);
});

export const SubscriptionController = {
  getUserSubscription,
  createCheckout,
  cancelSubscription,
  handleWebhook,
};
