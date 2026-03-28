import { Router } from "express";
import { AdminRoutes } from "../modules/admin/admin.route";
import { authRoute } from "../modules/auth/auth.route";

const router = Router();

router.use("/auth", authRoute);
router.use("/admin", AdminRoutes);

export const indexRoute = router;
