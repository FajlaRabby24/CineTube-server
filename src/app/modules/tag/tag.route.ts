import { Router } from "express";
import { Role } from "../../../generated/prisma";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { TagController } from "./tag.controller";
import { TagValidation } from "./tag.validation";

const router = Router();

router.get("/", TagController.getAllTags);

router.post(
  "/",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(TagValidation.createTagSchema),
  TagController.createTag,
);

router.patch(
  "/:tagId",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(TagValidation.updateTagSchema),
  TagController.updateTag,
);

router.delete(
  "/:tagId",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  TagController.deleteTag,
);

export const TagRoutes = router;
