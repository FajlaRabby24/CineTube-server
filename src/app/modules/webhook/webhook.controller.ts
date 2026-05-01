import { Request, Response } from "express";
import status from "http-status";
import { envVars } from "../../config/env.js";
import { stripe } from "../../config/stripe.config.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { SubscriptionService } from "../subscription/subscription.service.js";

const handleWebhook = catchAsync(async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"] as string;
  const webhookSecret = envVars.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return sendResponse(
      res,
      status.BAD_REQUEST,
      false,
      "Webhook secret not set",
    );
  }

  let event;
  try {
    // এখানে req.body অবশ্যই BUFFER হতে হবে (Raw Body)
    event = await stripe.webhooks.constructEventAsync(
      req.body,
      signature,
      webhookSecret,
    );
  } catch (err: any) {
    return sendResponse(
      res,
      status.BAD_REQUEST,
      false,
      `Webhook Error: ${err.message}`,
    );
  }

  // ইভেন্টটি সার্ভিসে পাঠানো হ্যান্ডেল করার জন্য
  await SubscriptionService.handleWebhookEvent(event);

  res.status(status.OK).json({ received: true });
});

export const WebhookController = {
  handleWebhook,
};
