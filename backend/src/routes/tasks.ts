import { Router, Request, Response } from "express";
import { prisma } from "../index";
import { z } from "zod";

const router = Router();

const createTaskSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["SCRAPE", "FORM_FILL", "SCREENSHOT", "CUSTOM"]),
  description: z.string().min(1),
});

router.get("/", async (_req: Request, res: Response) => {
  try {
    const { type, status } = _req.query;
    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const tasks = await prisma.task.findMany({
      where,
      include: { results: true, screenshots: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { results: true, screenshots: true },
    });
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const body = createTaskSchema.parse(req.body);
    const task = await prisma.task.create({ data: body });
    res.status(201).json(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create task" });
  }
});

router.post("/:id/execute", async (req: Request, res: Response) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
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

      await prisma.taskResult.create({
        data: {
          taskId: task.id,
          status: "SUCCESS",
          data: result,
          duration,
        },
      });

      await prisma.task.update({
        where: { id: task.id },
        data: { status: "COMPLETED" },
      });

      res.json({ status: "COMPLETED", duration, data: result });
    } catch (err: any) {
      await prisma.taskResult.create({
        data: {
          taskId: task.id,
          status: "ERROR",
          errorMsg: err.message,
        },
      });

      await prisma.task.update({
        where: { id: task.id },
        data: { status: "FAILED" },
      });

      res.status(500).json({ error: err.message });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to execute task" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ message: "Task deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete task" });
  }
});

export default router;
