import { z } from "zod";
import { ReportReason, ReportTargetType } from "../../../generated/prisma";

const createReportSchema = z.object({
  targetType: z.nativeEnum(ReportTargetType),
  targetId: z.string().min(1),
  reason: z.nativeEnum(ReportReason),
  description: z.string().max(500).optional(),
});

const resolveReportSchema = z.object({
  resolution: z.string().min(1).max(500),
});

export const ReportValidation = {
  createReportSchema,
  resolveReportSchema,
};
