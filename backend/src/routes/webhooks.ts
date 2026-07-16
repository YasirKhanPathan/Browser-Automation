import { Router, Request, Response } from "express";
import { prisma } from "../index";
import { fireWebhook } from "../services/webhook";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { taskId } = req.query;
    const where: any = { userId: authReq.userId };
    if (taskId) where.taskId = taskId;

    const webhooks = await prisma.webhook.findMany({
      where,
      include: { task: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ webhooks });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { taskId, url, secret, events } = req.body;
    if (!taskId) return res.status(400).json({ error: "taskId is required" });
    if (!url) return res.status(400).json({ error: "url is required" });

    const task = await prisma.task.findFirst({ where: { id: taskId, userId: authReq.userId } });
    if (!task) return res.status(404).json({ error: "Task not found" });

    const webhook = await prisma.webhook.create({
      data: {
        userId: authReq.userId!,
        taskId,
        url,
        secret: secret || null,
        events: events || ["completed"],
      },
    });

    res.status(201).json(webhook);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const webhook = await prisma.webhook.findFirst({
      where: { id: req.params.id, userId: authReq.userId },
    });
    if (!webhook) return res.status(404).json({ error: "Webhook not found" });

    const { enabled } = req.body;
    const updated = await prisma.webhook.update({
      where: { id: req.params.id },
      data: { enabled },
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const webhook = await prisma.webhook.findFirst({
      where: { id: req.params.id, userId: authReq.userId },
    });
    if (!webhook) return res.status(404).json({ error: "Webhook not found" });

    await prisma.webhook.delete({ where: { id: req.params.id } });
    res.json({ message: "Webhook deleted" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/:id/test", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const webhook = await prisma.webhook.findFirst({
      where: { id: req.params.id, userId: authReq.userId },
    });
    if (!webhook) return res.status(404).json({ error: "Webhook not found" });

    const payload = {
      event: "completed" as const,
      taskId: webhook.taskId,
      taskName: "Test",
      data: { test: true, message: "This is a test webhook" },
      timestamp: new Date().toISOString(),
    };

    const success = await fireWebhook(webhook.id, payload);
    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
