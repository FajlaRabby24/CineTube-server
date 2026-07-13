import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { ContactService } from "./contact.service.js";

const createContactMessage = catchAsync(async (req: Request, res: Response) => {
  const result = await ContactService.createContactMessageIntoDB(req.body);

  if (!result?.id) {
    return sendResponse(
      res,
      status.BAD_REQUEST,
      false,
      "Failed to create message",
    );
  }

  sendResponse(
    res,
    status.CREATED,
    true,
    "Your message has been sent and saved successfully!",
  );
});

export const ContactController = {
  createContactMessage,
};
