import status from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import AppError from "../../errorhandlers/AppError.js";
import { IQueryParams } from "../../interfaces/query.interface.js";
import { prisma } from "../../lib/prisma.js";
import { QueryBuilder } from "../../utils/QueryBuilder.js";

const getUserPaymentsFromDB = async (userId: string, query: IQueryParams) => {
  const paymentQuery = new QueryBuilder<
    Prisma.PaymentWhereInput,
    Prisma.PaymentWhereInput,
    Prisma.PaymentInclude
  >(prisma.payment, query, {
    searchableFields: [],
    filterableFields: ["status", "plan"],
  })
    .filter()
    .where({ userId })
    .sort()
    .paginate();

  return await paymentQuery.execute();
};

export const PaymentService = {
  getUserPaymentsFromDB,
};
