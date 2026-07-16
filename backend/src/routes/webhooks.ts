import { Router, Request, Response } from "express";
import { prisma } from "../index";
import { fireWebhook } from "../services/webhook";
import crypto from "crypto";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const { taskId } = req.query;
    const where: any = {};
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

router.post("/", async (req: Request, res: Response) => {
  try {
    const { taskId, url, secret, events } = req.body;
    if (!taskId) return res.status(400).json({ error: "taskId is required" });
    if (!url) return res.status(400).json({ error: "url is required" });

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ error: "Task not found" });

    const webhook = await prisma.webhook.create({
      data: {
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

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { enabled } = req.body;
    const webhook = await prisma.webhook.update({
      where: { id: req.params.id },
      data: { enabled },
    });
    res.json(webhook);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await prisma.webhook.delete({ where: { id: req.params.id } });
    res.json({ message: "Webhook deleted" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/:id/test", async (req: Request, res: Response) => {
  try {
    const webhook = await prisma.webhook.findUnique({ where: { id: req.params.id } });
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
