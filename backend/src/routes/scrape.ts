import { Router, Request, Response } from "express";
import { prisma } from "../index";
import { scrapePage, scrapePageDirect } from "../services/scraper";
import { smartScrape } from "../services/ai-extractor";
import { crawlPages, CrawlOptions } from "../services/crawler";

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

router.post("/smart", async (req: Request, res: Response) => {
  try {
    const { url, description } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });
    if (!description) return res.status(400).json({ error: "Description is required for smart scrape" });

    const hostname = new URL(url).hostname;

    const task = await prisma.task.create({
      data: {
        name: `Smart Scrape: ${hostname}`,
        type: "SCRAPE",
        description: `Smart scrape: ${description}`,
        config: { url, description, smart: true },
      },
    });

    await prisma.task.update({
      where: { id: task.id },
      data: { status: "RUNNING" },
    });

    const startTime = Date.now();
    try {
      const result = await smartScrape(url, description);
      const duration = Date.now() - startTime;

      await prisma.taskResult.create({
        data: { taskId: task.id, status: "SUCCESS", data: result.structured, duration },
      });

      await prisma.task.update({
        where: { id: task.id },
        data: { status: "COMPLETED" },
      });

      res.json({ taskId: task.id, data: result.structured, count: Array.isArray(result.structured) ? result.structured.length : 0 });
    } catch (err: any) {
      const duration = Date.now() - startTime;
      await prisma.taskResult.create({
        data: { taskId: task.id, status: "ERROR", errorMsg: err.message, duration },
      });
      await prisma.task.update({
        where: { id: task.id },
        data: { status: "FAILED" },
      });
      throw err;
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/crawl", async (req: Request, res: Response) => {
  try {
    const { url, description, maxPages = 5, strategy = "ai", nextSelector } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    const hostname = new URL(url).hostname;

    const task = await prisma.task.create({
      data: {
        name: `Crawl: ${hostname} (${maxPages} pages)`,
        type: "SCRAPE",
        description: `Multi-page crawl: ${description || url}`,
        config: { url, description, maxPages, strategy, nextSelector, crawl: true },
      },
    });

    await prisma.task.update({
      where: { id: task.id },
      data: { status: "RUNNING" },
    });

    const startTime = Date.now();
    try {
      const options: CrawlOptions = { maxPages, strategy: strategy as any, nextSelector, description };
      const result = await crawlPages(url, options);
      const duration = Date.now() - startTime;

      await prisma.taskResult.create({
        data: { taskId: task.id, status: "SUCCESS", data: result.aggregated, duration },
      });

      await prisma.task.update({
        where: { id: task.id },
        data: { status: "COMPLETED" },
      });

      res.json({
        taskId: task.id,
        pages: result.pages.length,
        aggregatedCount: result.aggregated.length,
        errors: result.errors,
      });
    } catch (err: any) {
      const duration = Date.now() - startTime;
      await prisma.taskResult.create({
        data: { taskId: task.id, status: "ERROR", errorMsg: err.message, duration },
      });
      await prisma.task.update({
        where: { id: task.id },
        data: { status: "FAILED" },
      });
      throw err;
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
