import { Router } from "express";
import { authRoute } from "../modules/auth/auth.route";
import { mediaRoute } from "../modules/media/media.route";

const router = Router();

router.use("/auth", authRoute);
router.use("/media", mediaRoute);

export const indexRoute = router;
