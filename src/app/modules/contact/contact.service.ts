import { prisma } from "../../lib/prisma.js";

const createContactMessageIntoDB = async (payload: {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}) => {
  const result = await prisma.contactMessage.create({
    data: payload,
    select: {
      id: true,
    },
  });
  return result;
};

export const ContactService = {
  createContactMessageIntoDB,
};
