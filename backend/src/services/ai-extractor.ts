import { callLLM, parseJSON } from "./ai";
import { scrapePageDirect } from "./scraper";

export async function extractStructuredData(rawContent: any[], userDescription: string): Promise<any> {
  // Truncate content if too large (keep under ~6000 chars for the prompt)
  const contentStr = JSON.stringify(rawContent, null, 2);
  const truncated = contentStr.length > 6000 ? contentStr.slice(0, 6000) + "\n...(truncated)" : contentStr;

  const prompt = `You are a data extraction assistant. Given the raw webpage content below and the user's extraction request, extract and return structured JSON data.

USER REQUEST: "${userDescription}"

RAW WEBPAGE CONTENT:
${truncated}

Respond with ONLY a JSON object or array. The structure should match what the user asked for.
Examples:
- If they asked for "product names and prices", return: [{"name": "...", "price": "..."}]
- If they asked for "all links", return: [{"text": "...", "url": "..."}]
- If they asked for "headings and descriptions", return: [{"heading": "...", "description": "..."}]

Return the data as a JSON array of objects. Each object represents one item.`;

  const text = await callLLM(prompt, 2);
  return parseJSON(text);
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
