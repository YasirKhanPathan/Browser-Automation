import { Router, Request, Response } from "express";
import { prisma } from "../index";
import { analyzeUrl } from "../services/ai";
import { scrapePage } from "../services/scraper";

const router = Router();

router.post("/analyze", async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    const analysis = await analyzeUrl(url);

    const task = await prisma.task.create({
      data: {
        name: `Scrape: ${new URL(url).hostname}`,
        type: "SCRAPE",
        description: `Scrape data from ${url}`,
        config: { url, selectors: analysis.selectors },
      },
    });

    res.json({ taskId: task.id, selectors: analysis.selectors, analysis });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/execute", async (req: Request, res: Response) => {
  try {
    const { taskId, url, selectors } = req.body;
    const data = await scrapePage(url, selectors);

    if (taskId) {
      await prisma.taskResult.create({
        data: {
          taskId,
          status: "SUCCESS",
          data,
        },
      });

      await prisma.task.update({
        where: { id: taskId },
        data: { status: "COMPLETED" },
      });
    }

    res.json({ data, count: Array.isArray(data) ? data.length : 0 });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
