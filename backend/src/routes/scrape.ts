import { Router, Request, Response } from "express";
import { prisma } from "../index";
import { scrapePage, scrapePageDirect } from "../services/scraper";

const router = Router();

router.post("/analyze", async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    // Try AI first, fall back to direct extraction
    let selectors;
    let analysis;
    try {
      const { analyzeUrl } = await import("../services/ai");
      analysis = await analyzeUrl(url);
      selectors = analysis.selectors;
    } catch {
      // AI unavailable - use smart defaults
      selectors = {
        container: "body",
        fields: { text: "h1, h2, h3, p, a, li, td, th" },
      };
      analysis = {
        selectors,
        suggestedName: `Scrape ${new URL(url).hostname}`,
        aiAvailable: false,
      };
    }

    const task = await prisma.task.create({
      data: {
        name: `Scrape: ${new URL(url).hostname}`,
        type: "SCRAPE",
        description: `Scrape data from ${url}`,
        config: { url, selectors },
      },
    });

    res.json({ taskId: task.id, selectors, analysis });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/execute", async (req: Request, res: Response) => {
  try {
    const { taskId, url, selectors } = req.body;

    let data;
    if (selectors && selectors.container !== "body") {
      // Use specific selectors if provided
      data = await scrapePage(url, selectors);
    } else {
      // Direct extraction - works without AI
      data = await scrapePageDirect(url);
    }

    if (taskId && taskId !== "manual") {
      await prisma.taskResult.create({
        data: { taskId, status: "SUCCESS", data },
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
