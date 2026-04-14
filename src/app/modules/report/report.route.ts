import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { ReportController } from "./report.controller";
import { ReportValidation } from "./report.validation";

const router = Router();

router.post(
  "/",
  checkAuth(),
  validateRequest(ReportValidation.createReportSchema),
  ReportController.createReport,
);

router.get(
  "/all",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  ReportController.getAllReportsFromDB,
);



router.patch(
  "/:reportId/resolve",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(ReportValidation.resolveReportSchema),
  ReportController.resolveReport,
);

router.patch(
  "/:reportId/dismiss",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  ReportController.dismissReport,
);

export const ReportRoutes = router;
