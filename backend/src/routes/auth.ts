import { Router, Request, Response } from "express";
import { createUser, loginUser, getUserById } from "../services/auth";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, name, password } = req.body;
    if (!email || !name || !password) {
      return res.status(400).json({ error: "Email, name, and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const result = await createUser(email, name, password);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const result = await loginUser(email, password);
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

router.get("/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const user = await getUserById(authReq.userId!);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
