import { callLLM, parseJSON } from "./ai";
import { scrapePageDirect } from "./scraper";
import { scrapePageLightweight } from "./lightweight-scraper";

export type ScrapeEngine = "auto" | "lightweight" | "playwright";

export async function extractStructuredData(rawContent: any[], userDescription: string): Promise<any> {
  // Truncate content aggressively — large prompts cause the model to return empty responses
  const contentStr = JSON.stringify(rawContent, null, 2);

  // Try with progressively smaller prompts until we get a response
  const truncationLimits = [3000, 1500, 500];

  for (const limit of truncationLimits) {
    const truncated = contentStr.length > limit ? contentStr.slice(0, limit) + "\n...(truncated)" : contentStr;

    const prompt = `Extract data from this webpage content.

REQUEST: "${userDescription}"

CONTENT:
${truncated}

Return ONLY a JSON array of objects matching the request. No markdown, no explanation.`;

    try {
      const text = await callLLM(prompt, 2);
      console.log(`[AI] Raw LLM response (first 200 chars):`, text.substring(0, 200));
      const parsed = parseJSON(text);
      console.log(`[AI] Parsed result:`, JSON.stringify(parsed).substring(0, 200));
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (err: any) {
      console.log(`[AI] Parse error (limit=${limit}):`, err.message);
      // Retry on empty response, parse errors, or "no JSON found" — try with smaller prompt
      if (limit > 500) {
        console.log(`[AI] Retrying with smaller prompt...`);
        continue;
      }
      throw err;
    }
  }

  // Final attempt with minimal content
  const minimalContent = contentStr.slice(0, 500) + "\n...(truncated)";
  const prompt = `Extract data from this webpage content.

REQUEST: "${userDescription}"

CONTENT:
${minimalContent}

Return ONLY a JSON array of objects matching the request. No markdown, no explanation.`;

  const text = await callLLM(prompt, 2);
  console.log(`[AI] Final attempt raw response (first 200 chars):`, text.substring(0, 200));
  const parsed = parseJSON(text);
  console.log(`[AI] Final attempt parsed:`, JSON.stringify(parsed).substring(0, 200));
  return Array.isArray(parsed) ? parsed : [parsed];
}

export async function smartScrape(
  url: string,
  description: string,
  engine: ScrapeEngine = "auto"
): Promise<any> {
  let rawContent: any[];
  let usedEngine: string;

  if (engine === "playwright") {
    // Force Playwright — skip lightweight entirely
    console.log(`[Scraper] Using Playwright (forced) for ${url}`);
    rawContent = await scrapePageDirect(url);
    usedEngine = "playwright";
  } else if (engine === "lightweight") {
    // Force lightweight — no fallback
    console.log(`[Scraper] Using lightweight fetch for ${url}`);
    rawContent = await scrapePageLightweight(url);
    usedEngine = "lightweight";
  } else {
    // Auto-detect: try lightweight first, fall back to Playwright
    console.log(`[Scraper] Auto-detect mode for ${url}`);
    rawContent = await scrapePageLightweight(url);

    if (rawContent.length <= 2) {
      console.log(`[Scraper] Lightweight returned only ${rawContent.length} items — retrying with Playwright`);
      rawContent = await scrapePageDirect(url);
      usedEngine = "playwright";
    } else {
      console.log(`[Scraper] Lightweight succeeded with ${rawContent.length} items`);
      usedEngine = "lightweight";
    }
  }

  // Step 2: Use AI to extract structured data based on user description
  const structuredData = await extractStructuredData(rawContent, description);

  return {
    raw: rawContent,
    structured: structuredData,
    url,
    description,
    engine: usedEngine,
  };
}
