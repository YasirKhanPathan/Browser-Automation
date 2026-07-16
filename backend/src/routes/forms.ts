import { Router, Request, Response } from "express";
import { prisma } from "../index";
import { fillForm, detectFormFields } from "../services/scraper";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

router.post("/analyze", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    const analysis = await detectFormFields(url);

    const task = await prisma.task.create({
      data: {
        userId: authReq.userId!,
        name: `Form Fill: ${new URL(url).hostname}`,
        type: "FORM_FILL",
        description: `Fill form on ${url}`,
        config: { url, fields: analysis.fields },
      },
    });

    res.json({ taskId: task.id, fields: analysis.fields, submitButton: analysis.submitButton });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/execute", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { taskId, url, fields } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });
    if (!fields) return res.status(400).json({ error: "Fields are required" });

    if (taskId && taskId !== "manual") {
      const task = await prisma.task.findFirst({
        where: { id: taskId, userId: authReq.userId },
      });
      if (!task) return res.status(404).json({ error: "Task not found" });
    }

    const result = await fillForm(url, fields);

    if (taskId && taskId !== "manual") {
      await prisma.$transaction([
        prisma.taskResult.create({
          data: { taskId, status: "SUCCESS", data: result },
        }),
        prisma.task.update({
          where: { id: taskId },
          data: { status: "COMPLETED" },
        }),
      ]);
    }

    res.json({ ...result, taskId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
