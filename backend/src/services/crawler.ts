import { chromium, Browser, BrowserContext, Page } from "playwright";
import { callLLM, parseJSON } from "./ai";
import { extractStructuredData } from "./ai-extractor";

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      headless: process.env.HEADLESS !== "false",
    });
  }
  return browser;
}

export interface CrawlOptions {
  maxPages: number;
  strategy: "ai" | "selector" | "sitemap";
  nextSelector?: string;
  description?: string;
}

export interface CrawlResult {
  pages: { url: string; data: any[]; pageIndex: number }[];
  aggregated: any[];
  totalPages: number;
  errors: string[];
}

async function discoverNextPage(page: Page, strategy: string, nextSelector?: string): Promise<string | null> {
  if (strategy === "selector" && nextSelector) {
    // Manual selector: find the next page link
    const href = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el && (el.tagName === "A" || el.closest("a"))) {
        return (el.tagName === "A" ? el : el.closest("a"))?.getAttribute("href");
      }
      return null;
    }, nextSelector);
    return href || null;
  }

  if (strategy === "ai") {
    // AI-powered: detect next page link from page HTML
    const html = await page.evaluate(() => {
      const nav = document.querySelector("nav, .pagination, [class*='pagination'], [class*='pager']");
      return nav ? nav.outerHTML : document.body.innerHTML.slice(0, 5000);
    });

    const prompt = `Given this HTML snippet from a web page, find the URL or href for the "next page" link/button. 
If there is no next page link, respond with null.

HTML:
${html}

Respond with ONLY a JSON object: {"nextHref": "url or null"}`;

    try {
      const text = await callLLM(prompt, 1);
      const result = parseJSON(text);
      return result.nextHref;
    } catch {
      return null;
    }
  }

  if (strategy === "sitemap") {
    // Sitemap: handled at the crawl level, not page level
    return null;
  }

  return null;
}

function resolveUrl(base: string, href: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return "";
  }
}

export async function crawlPages(
  startUrl: string,
  options: CrawlOptions,
  onProgress?: (page: number, url: string) => void
): Promise<CrawlResult> {
  const b = await getBrowser();
  const context = await b.newContext();
  const result: CrawlResult = {
    pages: [],
    aggregated: [],
    totalPages: 0,
    errors: [],
  };

  try {
    let currentUrl = startUrl;
    const visited = new Set<string>();
    const toVisit: string[] = [startUrl];

    // If sitemap strategy, fetch sitemap first
    if (options.strategy === "sitemap") {
      const sitemapUrl = new URL("/sitemap.xml", startUrl).toString();
      try {
        const sitemapPage = await context.newPage();
        await sitemapPage.goto(sitemapUrl, { timeout: 10000 });
        const xml = await sitemapPage.content();
        await sitemapPage.close();

        // Extract URLs from sitemap XML
        const urlRegex = /<loc>(.*?)<\/loc>/g;
        let match;
        while ((match = urlRegex.exec(xml)) !== null) {
          const url = match[1];
          if (url && !visited.has(url)) {
            toVisit.push(url);
          }
        }
      } catch {
        result.errors.push("Failed to fetch sitemap, falling back to single page");
      }
    }

    let pageIndex = 0;
    while (toVisit.length > 0 && pageIndex < options.maxPages) {
      const url = toVisit.shift()!;
      if (visited.has(url)) continue;
      visited.add(url);

      onProgress?.(pageIndex + 1, url);

      const page = await context.newPage();
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

        const data = await page.evaluate(() => {
          const results: Record<string, string>[] = [];

          // Extract ALL text blocks from the page
          document.querySelectorAll("h1, h2, h3, h4, h5, h6, p, span.text, small.author, blockquote, figcaption, cite, td, th, li, dt, dd").forEach((el) => {
            const text = el.textContent?.trim();
            if (text && text.length > 5) {
              results.push({ type: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ')[0] : ''), text });
            }
          });

          // Extract links
          document.querySelectorAll("a[href]").forEach((a) => {
            const text = a.textContent?.trim();
            if (text && text.length > 1) {
              results.push({ type: "link", text, href: (a as HTMLAnchorElement).href });
            }
          });

          // Extract table data
          document.querySelectorAll("table").forEach((table) => {
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
          document.querySelectorAll("img[src]").forEach((img) => {
            const alt = (img as HTMLImageElement).alt || "";
            const src = (img as HTMLImageElement).src;
            if (alt || src) {
              results.push({ type: "image", alt, src });
            }
          });

          return results;
        });

        result.pages.push({ url, data, pageIndex });
        result.aggregated.push(...data.map((item) => ({ ...item, _sourceUrl: url })));
        result.totalPages = pageIndex + 1;

        // Discover next page
        if (options.strategy !== "sitemap" && pageIndex < options.maxPages - 1) {
          const nextHref = await discoverNextPage(page, options.strategy, options.nextSelector);
          if (nextHref) {
            const nextUrl = resolveUrl(url, nextHref);
            if (nextUrl && !visited.has(nextUrl) && nextUrl.startsWith("http")) {
              toVisit.push(nextUrl);
            }
          }
        }
      } catch (err: any) {
        result.errors.push(`Failed to crawl ${url}: ${err.message}`);
      } finally {
        await page.close();
      }

      pageIndex++;
    }
  } finally {
    await context.close();
  }

  // If a description is provided, use the LLM to extract structured data
  if (options.description && result.aggregated.length > 0) {
    try {
      console.log(`[Crawler] Extracting structured data with LLM (${result.aggregated.length} items)...`);
      const structured = await extractStructuredData(result.aggregated, options.description);
      if (Array.isArray(structured) && structured.length > 0) {
        result.aggregated = structured;
      }
    } catch (err: any) {
      console.error(`[Crawler] LLM extraction failed, keeping raw data: ${err.message}`);
      result.errors.push(`LLM extraction failed: ${err.message}`);
    }
  }

  return result;
}
