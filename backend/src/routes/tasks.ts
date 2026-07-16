import { Router, Request, Response } from "express";
import { prisma } from "../index";
import { z } from "zod";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

const createTaskSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["SCRAPE", "FORM_FILL", "SCREENSHOT", "CUSTOM"]),
  description: z.string().min(1),
  config: z.any().optional(),
});

router.get("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { type, status } = req.query;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 50));
    const skip = (page - 1) * pageSize;

    const where: any = { userId: authReq.userId };
    if (type) where.type = type;
    if (status) where.status = status;

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        select: {
          id: true,
          name: true,
          type: true,
          description: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { results: true, screenshots: true } },
          results: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, duration: true, createdAt: true } },
          screenshots: { orderBy: { createdAt: "desc" }, take: 1, select: { filename: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.task.count({ where }),
    ]);
    res.json({ tasks, total, page, pageSize });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

router.get("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const task = await prisma.task.findFirst({
      where: { id: req.params.id, userId: authReq.userId },
      include: {
        results: { orderBy: { createdAt: "desc" }, take: 10 },
        screenshots: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

router.post("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const body = createTaskSchema.parse(req.body);
    const task = await prisma.task.create({
      data: {
        userId: authReq.userId!,
        name: body.name,
        type: body.type,
        description: body.description,
        config: body.config || undefined,
      },
    });
    res.status(201).json(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create task" });
  }
});

router.post("/:id/execute", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const task = await prisma.task.findFirst({
      where: { id: req.params.id, userId: authReq.userId },
    });
    if (!task) return res.status(404).json({ error: "Task not found" });

    await prisma.task.update({
      where: { id: task.id },
      data: { status: "RUNNING" },
    });

    const startTime = Date.now();
    try {
      const { runTask } = await import("../services/runner");
      const result = await runTask(task);
      const duration = Date.now() - startTime;

      await prisma.$transaction([
        prisma.taskResult.create({
          data: {
            taskId: task.id,
            status: "SUCCESS",
            data: result,
            duration,
          },
        }),
        prisma.task.update({
          where: { id: task.id },
          data: { status: "COMPLETED" },
        }),
      ]);

      try {
        const { fireWebhooksForTask } = await import("../services/webhook");
        await fireWebhooksForTask(task.id, "completed", result);
      } catch {}

      res.json({ status: "COMPLETED", duration, data: result });
    } catch (err: any) {
      console.error(`[Execute] Task ${task.id} (${task.type}) failed:`, err.message);
      await prisma.$transaction([
        prisma.taskResult.create({
          data: {
            taskId: task.id,
            status: "ERROR",
            errorMsg: err.message,
          },
        }),
        prisma.task.update({
          where: { id: task.id },
          data: { status: "FAILED" },
        }),
      ]);

      res.status(500).json({ error: err.message });
    }
  } catch (error: any) {
    console.error("[Execute] Unexpected error:", error.message);
    res.status(500).json({ error: "Failed to execute task" });
  }
});

router.delete("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const task = await prisma.task.findFirst({
      where: { id: req.params.id, userId: authReq.userId },
    });
    if (!task) return res.status(404).json({ error: "Task not found" });
    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ message: "Task deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete task" });
  }
});

export default router;
