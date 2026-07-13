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

const getContactMessages = catchAsync(async (req: Request, res: Response) => {
  const result = await ContactService.getContactMessagesFromDB(req.query);

  sendResponse(
    res,
    status.OK,
    true,
    "Contact messages retrieved successfully!",
    result.data,
    result.meta,
  );
});

export const ContactController = {
  createContactMessage,
  getContactMessages,
};
