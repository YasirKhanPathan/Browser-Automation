import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/auth";

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required. Please log in." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyToken(token);
    const authReq = req as AuthRequest;
    authReq.userId = payload.userId;
    authReq.userEmail = payload.email;
    next();
  } catch (error: any) {
    return res.status(401).json({ error: "Invalid or expired token. Please log in again." });
  }
}
