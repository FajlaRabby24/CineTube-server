import { z } from "zod";
import { AdminValidation } from "./admin.validation";

export type IAdminCreatePayload = z.infer<typeof AdminValidation.createAdminSchema>;
