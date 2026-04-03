import rateLimit from "express-rate-limit";

// 1. Global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: "Too many requests" },
  standardHeaders: true,
  legacyHeaders: false,
});

// 2. Auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many login attempts" },
  standardHeaders: true,
  legacyHeaders: false,
});

// 3. Payment
const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many payment requests" },
  standardHeaders: true,
  legacyHeaders: false,
});

export const rateLimiters = {
  globalLimiter,
  authLimiter,
  paymentLimiter,
};
