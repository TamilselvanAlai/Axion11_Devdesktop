import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User } from "../models/User.js";
import { signToken } from "../lib/jwt.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function toPublicUser(user: { _id: unknown; name: string; email: string; role: string; initials: string }) {
  return { id: String(user._id), name: user.name, email: user.email, role: user.role, initials: user.initials };
}

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Email and password are required." });
    return;
  }

  const user = await User.findOne({ email: parsed.data.email.toLowerCase() });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    res.status(401).json({ message: "Incorrect email or password. Please try again." });
    return;
  }

  const token = signToken({ sub: String(user._id), email: user.email });
  res.json({ token, user: toPublicUser(user), expiresAt: Date.now() + 8 * 60 * 60 * 1000 });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.auth!.sub);
  if (!user) {
    res.status(404).json({ message: "User not found." });
    return;
  }
  res.json(toPublicUser(user));
});

authRouter.post("/logout", requireAuth, (_req, res) => {
  res.status(204).end();
});
