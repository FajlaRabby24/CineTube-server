import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { MediaController } from "./media.controller";
import { MediaValidation } from "./media.validation";

const router = Router();

// Public routes
router.get("/", MediaController.getAllMedia);
router.get("/:slug", MediaController.getMediaBySlug);

// Admin routes
router.post(
  "/",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(MediaValidation.createMediaSchema),
  MediaController.createMedia,
);

router.patch(
  "/:id",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(MediaValidation.updateMediaSchema),
  MediaController.updateMedia,
);

router.delete(
  "/:id",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  MediaController.deleteMedia,
);

export const MediaRoutes = router;
