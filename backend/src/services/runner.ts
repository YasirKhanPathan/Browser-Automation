import { prisma } from "../index";
import { scrapePage, scrapePageDirect, fillForm, captureScreenshot } from "./scraper";
import { smartScrape } from "./ai-extractor";
import { crawlPages, CrawlOptions } from "./crawler";
import { fireWebhooksForTask } from "./webhook";
import path from "path";
import fs from "fs";

function extractUrl(config: any): string {
  // Direct URL in config
  if (config?.url) return config.url;

  // Extract from plan steps (find first navigate action with HTTP URL)
  if (config?.plan && Array.isArray(config.plan)) {
    for (const step of config.plan) {
      if (step.action === "navigate" && step.target?.startsWith("http")) {
        return step.target;
      }
    }
  }

  return "";
}

export async function runTask(task: any) {
  const config = task.config as any;

  switch (task.type) {
    case "SCRAPE": {
      const url = extractUrl(config);
      if (!url) throw new Error("No URL configured for scrape task");

      // Smart mode: use AI extraction if description is provided
      if (config?.smart && config?.description) {
        const result = await smartScrape(url, config.description);
        return result.structured;
      }

      // Crawl mode: multi-page scraping
      if (config?.crawl) {
        const options: CrawlOptions = {
          maxPages: config.maxPages || 5,
          strategy: config.strategy || "ai",
          nextSelector: config.nextSelector,
          description: config.description,
        };
        const result = await crawlPages(url, options);
        return result.aggregated;
      }

      const selectors = config?.selectors;
      if (selectors && selectors.container !== "body") {
        return await scrapePage(url, selectors);
      }
      return await scrapePageDirect(url);
    }

    case "FORM_FILL": {
      const url = extractUrl(config);
      const fields = config?.fields;
      if (!url) throw new Error("No URL configured for form fill task");
      if (!fields) throw new Error("No fields configured for form fill task");
      return await fillForm(url, fields);
    }

    case "SCREENSHOT": {
      const url = extractUrl(config);
      if (!url) throw new Error("No URL configured for screenshot task");

      const screenshotsDir = path.join(process.cwd(), "uploads", "screenshots");
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }

      const filename = `${task.id}-${Date.now()}.png`;
      const filepath = path.join(screenshotsDir, filename);
      await captureScreenshot(url, filepath, { fullPage: true });

      await prisma.screenshot.create({
        data: { taskId: task.id, filename, filepath, pageUrl: url },
      });

      return { filename, url: `/uploads/screenshots/${filename}` };
    }

    case "CUSTOM": {
      const url = extractUrl(config);
      const plan = config?.plan;
      if (!url && !(plan && Array.isArray(plan))) {
        throw new Error("No URL or plan configured for custom task");
      }

      const steps = plan && Array.isArray(plan) ? plan : [{ action: "navigate", target: url }];
      const results: any[] = [];

      for (const step of steps) {
        switch (step.action) {
          case "navigate":
            results.push({ action: "navigate", target: step.target, status: "done" });
            break;
          case "screenshot": {
            const targetUrl = extractUrl(config);
            if (!targetUrl) throw new Error("No URL for screenshot step");
            const screenshotsDir = path.join(process.cwd(), "uploads", "screenshots");
            if (!fs.existsSync(screenshotsDir)) {
              fs.mkdirSync(screenshotsDir, { recursive: true });
            }
            const filename = `${task.id}-${Date.now()}.png`;
            const filepath = path.join(screenshotsDir, filename);
            await captureScreenshot(targetUrl, filepath, { fullPage: true });
            await prisma.screenshot.create({
              data: { taskId: task.id, filename, filepath, pageUrl: targetUrl },
            });
            results.push({ action: "screenshot", filename, url: `/uploads/screenshots/${filename}`, status: "done" });
            break;
          }
          case "scrape": {
            const targetUrl = extractUrl(config);
            if (!targetUrl) throw new Error("No URL for scrape step");
            const data = await scrapePageDirect(targetUrl);
            results.push({ action: "scrape", data, status: "done" });
            break;
          }
          default:
            results.push({ action: step.action, status: "skipped", reason: "unknown action" });
        }
      }

      return results;
    }

    default:
      throw new Error(`Unknown task type: ${task.type}`);
  }
}
