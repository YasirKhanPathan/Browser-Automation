import * as cheerio from "cheerio";

/**
 * Lightweight scraper using fetch + cheerio (no browser).
 * Returns the same data structure as scrapePageDirect() from scraper.ts.
 */
export async function scrapePageLightweight(url: string): Promise<Record<string, string>[]> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const results: Record<string, string>[] = [];

  // Extract text blocks (same selectors as Playwright version)
  const textSelectors = "h1, h2, h3, h4, h5, h6, p, span.text, small.author, blockquote, figcaption, cite, td, th, li, dt, dd";
  $(textSelectors).each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 5) {
      const tagName = el.tagName?.toLowerCase() || "div";
      const className = $(el).attr("class")?.split(" ")[0] || "";
      results.push({ type: className ? `${tagName}.${className}` : tagName, text });
    }
  });

  // Extract links
  $("a[href]").each((_, el) => {
    const text = $(el).text().trim();
    const href = $(el).attr("href");
    if (text && text.length > 1 && href) {
      // Resolve relative URLs
      let fullHref = href;
      try {
        fullHref = new URL(href, url).toString();
      } catch { /* keep as-is */ }
      results.push({ type: "link", text, href: fullHref });
    }
  });

  // Extract table data
  $("table").each((_, table) => {
    const headers: string[] = [];
    $(table).find("th").each((_, th) => {
      headers.push($(th).text().trim() || "");
    });
    $(table).find("tbody tr").each((_, row) => {
      const cells: string[] = [];
      $(row).find("td").each((_, td) => {
        cells.push($(td).text().trim() || "");
      });
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
  $("img[src]").each((_, el) => {
    const alt = $(el).attr("alt") || "";
    const src = $(el).attr("src") || "";
    if (alt || src) {
      let fullSrc = src;
      try {
        fullSrc = new URL(src, url).toString();
      } catch { /* keep as-is */ }
      results.push({ type: "image", alt, src: fullSrc });
    }
  });

  return results.length > 0 ? results : [{ info: "No content found on page", url }];
}
