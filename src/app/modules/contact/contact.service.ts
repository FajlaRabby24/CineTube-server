import { prisma } from "../../lib/prisma.js";
import { QueryBuilder } from "../../utils/QueryBuilder.js";

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

const getContactMessagesFromDB = async (query: Record<string, any>) => {
  const contactQuery = new QueryBuilder(prisma.contactMessage, query, {
    searchableFields: ["name", "email", "subject", "message"],
    filterableFields: ["email", "subject"],
  })
    .search()
    .filter()
    .sort()
    .paginate();

  const result = await contactQuery.execute();
  return result;
};

export const ContactService = {
  createContactMessageIntoDB,
  getContactMessagesFromDB,
};
