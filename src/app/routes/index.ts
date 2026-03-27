import { Router } from "express";
import { authRoute } from "../modules/auth/auth.route";

const router = Router();

router.use("/auth", authRoute);

export const indexRoute = router;
