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

export async function scrapePageDirect(url: string) {
  const b = await getBrowser();
  const context = await b.newContext();
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    const data = await page.evaluate(() => {
      const results: Record<string, string>[] = [];

      // Extract links
      const links = document.querySelectorAll("a[href]");
      if (links.length > 0) {
        links.forEach((a) => {
          const text = a.textContent?.trim();
          if (text && text.length > 1) {
            results.push({ type: "link", text, href: (a as HTMLAnchorElement).href });
          }
        });
      }

      // Extract headings
      const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
      headings.forEach((h) => {
        const text = h.textContent?.trim();
        if (text) {
          results.push({ type: h.tagName.toLowerCase(), text });
        }
      });

      // Extract paragraphs
      const paragraphs = document.querySelectorAll("p");
      paragraphs.forEach((p) => {
        const text = p.textContent?.trim();
        if (text && text.length > 10) {
          results.push({ type: "paragraph", text });
        }
      });

      // Extract list items
      const listItems = document.querySelectorAll("li");
      listItems.forEach((li) => {
        const text = li.textContent?.trim();
        if (text && text.length > 2) {
          results.push({ type: "list-item", text });
        }
      });

      // Extract table data
      const tables = document.querySelectorAll("table");
      tables.forEach((table) => {
        const headers = Array.from(table.querySelectorAll("th")).map((th) => th.textContent?.trim() || "");
        const rows = table.querySelectorAll("tbody tr");
        rows.forEach((row) => {
          const cells = Array.from(row.querySelectorAll("td")).map((td) => td.textContent?.trim() || "");
          if (headers.length > 0) {
            const item: Record<string, string> = {};
            headers.forEach((h, i) => { item[h] = cells[i] || ""; });
            results.push(item);
          } else if (cells.length > 0) {
            results.push({ text: cells.join(" | ") });
          }
        });
      });

      // Extract images
      const images = document.querySelectorAll("img[src]");
      images.forEach((img) => {
        const alt = (img as HTMLImageElement).alt || "";
        const src = (img as HTMLImageElement).src;
        if (alt || src) {
          results.push({ type: "image", alt, src });
        }
      });

      return results;
    });

    return data.length > 0 ? data : [{ info: "No content found on page", url }];
  } finally {
    await context.close();
  }
}

export async function detectFormFields(url: string) {
  const b = await getBrowser();
  const context = await b.newContext();
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    const fields = await page.evaluate(() => {
      const inputs = document.querySelectorAll("input, textarea, select");
      return Array.from(inputs).map((el, i) => {
        const input = el as HTMLInputElement;
        const name = input.name || input.id || `field_${i}`;
        const type = input.type || (el.tagName === "TEXTAREA" ? "textarea" : el.tagName === "SELECT" ? "select" : "text");
        const label = input.labels?.[0]?.textContent?.trim() || input.placeholder || name;
        const selector = input.name
          ? `input[name='${input.name}']`
          : input.id
            ? `#${input.id}`
            : `input:nth-of-type(${i + 1})`;
        return { name, type, label, selector };
      });
    });

    const submitButton = await page.evaluate(() => {
      const btn = document.querySelector("button[type='submit'], input[type='submit'], button:not([type='button'])");
      return btn ? (btn as HTMLElement).textContent?.trim() || "Submit" : null;
    });

    return { fields, submitButton };
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
