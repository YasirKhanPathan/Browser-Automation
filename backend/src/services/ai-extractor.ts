import { callLLM, parseJSON } from "./ai";
import { scrapePageDirect } from "./scraper";

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
      console.log(`[AI] Parse error:`, err.message);
      if (err.message === "LLM returned empty response" && limit > 500) {
        console.log(`[AI] Empty response with ${limit} char limit, retrying with smaller prompt...`);
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

export async function smartScrape(url: string, description: string): Promise<any> {
  // Step 1: Get raw content from the page
  const rawContent = await scrapePageDirect(url);

  // Step 2: Use AI to extract structured data based on user description
  const structuredData = await extractStructuredData(rawContent, description);

  return {
    raw: rawContent,
    structured: structuredData,
    url,
    description,
  };
}
