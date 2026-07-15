import { chromium, Browser, BrowserContext, Page } from "playwright";

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      headless: process.env.HEADLESS !== "false",
    });
  }
  return browser;
}

export async function scrapePage(url: string, selectors: any) {
  const b = await getBrowser();
  const context = await b.newContext();
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    const containerSelector = selectors?.container || "body";
    const fieldSelectors = selectors?.fields || { text: "p, h1, h2, h3" };

    const data = await page.$$eval(containerSelector, (containers, fields) => {
      return containers.map((container) => {
        const item: Record<string, string> = {};
        for (const [key, selector] of Object.entries(fields)) {
          const el = container.querySelector(selector as string);
          item[key] = el?.textContent?.trim() || "";
        }
        return item;
      });
    }, fieldSelectors);

    return data.length > 0 ? data : [{ info: "No matching elements found", url }];
  } finally {
    await context.close();
  }
}

export async function fillForm(url: string, fields: Record<string, any>) {
  const b = await getBrowser();
  const context = await b.newContext();
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    const filled: Record<string, string> = {};

    for (const [name, config] of Object.entries(fields)) {
      const selector = config.selector || config;
      const value = config.value || config;

      try {
        if (config.type === "checkbox") {
          await page.check(selector);
          filled[name] = "checked";
        } else if (config.type === "select") {
          await page.selectOption(selector, value);
          filled[name] = value;
        } else {
          await page.fill(selector, String(value));
          filled[name] = String(value);
        }
      } catch {
        filled[name] = `failed: ${selector}`;
      }
    }

    return { filled, success: true };
  } finally {
    await context.close();
  }
}

export async function captureScreenshot(
  url: string,
  filepath: string,
  options: { fullPage?: boolean } = {}
) {
  const b = await getBrowser();
  const context = await b.newContext();
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.screenshot({
      path: filepath,
      fullPage: options.fullPage !== false,
    });
  } finally {
    await context.close();
  }
}

export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
