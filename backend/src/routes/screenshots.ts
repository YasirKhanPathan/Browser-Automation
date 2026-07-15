import { Router, Request, Response } from "express";
import { prisma } from "../index";
import { captureScreenshot } from "../services/scraper";
import path from "path";
import fs from "fs";

const router = Router();

router.post("/capture", async (req: Request, res: Response) => {
  try {
    const { taskId, url, fullPage = true } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    const screenshotsDir = path.join(process.cwd(), "uploads", "screenshots");
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
    const filepath = path.join(screenshotsDir, filename);

    await captureScreenshot(url, filepath, { fullPage });

    const screenshot = await prisma.screenshot.create({
      data: {
        taskId: taskId || "manual",
        filename,
        filepath,
        pageUrl: url,
      },
    });

    res.json({
      id: screenshot.id,
      filename,
      url: `/uploads/screenshots/${filename}`,
      pageUrl: url,
      createdAt: screenshot.createdAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:taskId", async (req: Request, res: Response) => {
  try {
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
