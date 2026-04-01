import { Payment, Prisma } from "../../../generated/prisma/client";
import { IQueryParams } from "../../interfaces/query.interface.js";
import { prisma } from "../../lib/prisma.js";
import { QueryBuilder } from "../../utils/QueryBuilder.js";

const getUserPaymentsFromDB = async (userId: string, query: IQueryParams) => {
  const paymentQuery = new QueryBuilder<
    Payment,
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
