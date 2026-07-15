import { prisma } from "../index";
import { scrapePage, scrapePageDirect, fillForm, captureScreenshot } from "./scraper";
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

    default:
      throw new Error(`Unknown task type: ${task.type}`);
  }
}
