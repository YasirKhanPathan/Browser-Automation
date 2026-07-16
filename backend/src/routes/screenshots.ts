import { Router, Request, Response } from "express";
import { prisma } from "../index";
import { captureScreenshot } from "../services/scraper";
import path from "path";
import fs from "fs";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

router.post("/capture", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { taskId, url, fullPage = true } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    if (taskId && taskId !== "manual") {
      const task = await prisma.task.findFirst({
        where: { id: taskId, userId: authReq.userId },
      });
      if (!task) return res.status(404).json({ error: "Task not found" });
    }

    const screenshotsDir = path.join(process.cwd(), "uploads", "screenshots");
    await fs.promises.mkdir(screenshotsDir, { recursive: true });

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
    const filepath = path.join(screenshotsDir, filename);

    await captureScreenshot(url, filepath, { fullPage });

    const isUUID = taskId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId);

    if (isUUID) {
      await prisma.$transaction([
        prisma.screenshot.create({
          data: { taskId, filename, filepath, pageUrl: url },
        }),
        prisma.taskResult.create({
          data: {
            taskId,
            status: "SUCCESS",
            data: { url: `/uploads/screenshots/${filename}`, filename },
            duration: 0,
          },
        }),
        prisma.task.update({
          where: { id: taskId },
          data: { status: "COMPLETED" },
        }),
      ]);
    }

    res.json({
      id: filename,
      filename,
      url: `/uploads/screenshots/${filename}`,
      pageUrl: url,
      createdAt: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:taskId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const task = await prisma.task.findFirst({
      where: { id: req.params.taskId, userId: authReq.userId },
    });
    if (!task) return res.status(404).json({ error: "Task not found" });

    const screenshots = await prisma.screenshot.findMany({
      where: { taskId: req.params.taskId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ screenshots });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch screenshots" });
  }
});

export default router;
