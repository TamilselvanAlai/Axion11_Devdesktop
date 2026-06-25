import { z } from "zod";
import { VALIDATION } from "./constants";

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(VALIDATION.minPasswordLength, `Password must be at least ${VALIDATION.minPasswordLength} characters`),
  rememberMe: z.boolean(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
