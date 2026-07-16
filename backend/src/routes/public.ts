import { Router, Request, Response } from "express";
import { prisma } from "../index";
import crypto from "crypto";

const router = Router();

// Public API: get task results by API key
router.get("/results/:taskId", async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const apiKey = req.headers["x-api-key"] || req.query.apiKey;

    if (!apiKey) {
      return res.status(401).json({ error: "API key required. Pass via X-API-Key header or ?apiKey= query param." });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId, apiKey: String(apiKey) },
      include: {
        results: { orderBy: { createdAt: "desc" }, take: 1 },
        screenshots: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found or invalid API key" });
    }

    res.json({
      taskId: task.id,
      name: task.name,
      type: task.type,
      status: task.status,
      data: task.results[0]?.data || null,
      screenshot: task.screenshots[0] ? `/uploads/screenshots/${task.screenshots[0].filename}` : null,
      updatedAt: task.updatedAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Public API: list all tasks with API keys
router.get("/tasks", async (req: Request, res: Response) => {
  try {
    const apiKey = req.headers["x-api-key"] || req.query.apiKey;

    if (!apiKey) {
      return res.status(401).json({ error: "API key required" });
    }

    const tasks = await prisma.task.findMany({
      where: { apiKey: String(apiKey) },
      include: {
        results: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      tasks: tasks.map((t) => ({
        taskId: t.id,
        name: t.name,
        type: t.type,
        status: t.status,
        lastResult: t.results[0]?.data || null,
        updatedAt: t.updatedAt,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Generate API key for a task
router.post("/generate-key/:taskId", async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ error: "Task not found" });

    const apiKey = `bk_${crypto.randomBytes(24).toString("hex")}`;

    await prisma.task.update({
      where: { id: taskId },
      data: { apiKey },
    });

    res.json({ apiKey, taskId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
