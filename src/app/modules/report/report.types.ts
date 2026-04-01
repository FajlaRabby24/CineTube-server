import z from "zod";
import { ReportValidation } from "./report.validation";

export type ICreateReportPaylod = z.infer<
  typeof ReportValidation.createReportSchema
>;
