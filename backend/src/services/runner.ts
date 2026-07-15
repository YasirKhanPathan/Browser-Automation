import { prisma } from "../index";
import { scrapePage, fillForm, captureScreenshot } from "./scraper";
import path from "path";
import fs from "fs";

export async function runTask(task: any) {
  const config = task.config as any;

  switch (task.type) {
    case "SCRAPE": {
      const url = config?.url;
      const selectors = config?.selectors;
      if (!url) throw new Error("No URL configured for scrape task");
      return await scrapePage(url, selectors);
    }

    case "FORM_FILL": {
      const url = config?.url;
      const fields = config?.fields;
      if (!url) throw new Error("No URL configured for form fill task");
      return await fillForm(url, fields);
    }

    case "SCREENSHOT": {
      const url = config?.url;
      if (!url) throw new Error("No URL configured for screenshot task");

      const screenshotsDir = path.join(process.cwd(), "uploads", "screenshots");
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }

      const filename = `${task.id}-${Date.now()}.png`;
      const filepath = path.join(screenshotsDir, filename);
      await captureScreenshot(url, filepath, { fullPage: true });

      await prisma.screenshot.create({
        data: {
          taskId: task.id,
          filename,
          filepath,
          pageUrl: url,
        },
      });

      return { filename, url: `/uploads/screenshots/${filename}` };
    }

    default:
      throw new Error(`Unknown task type: ${task.type}`);
  }
}
