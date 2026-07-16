const LLM_API_URL = process.env.LLM_API_URL || "http://localhost:19999/v1/chat/completions";
const LLM_MODEL = process.env.LLM_MODEL || "xiaomimimo/mimo-v2.5";
const LLM_API_KEY = process.env.LLM_API_KEY || "";

export async function callLLM(prompt: string, retries = 2): Promise<string> {
  if (!LLM_API_KEY) {
    throw new Error("LLM API key not configured. Set LLM_API_KEY in backend/.env");
  }

  let lastError: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

    try {
      const body = JSON.stringify({
        model: LLM_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 4096,
      });
      console.log(`[LLM] Attempt ${attempt + 1}/${retries + 1}, prompt length:`, prompt.length);

      const response = await fetch(LLM_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LLM_API_KEY}`,
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`LLM API error (${response.status}): ${text}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      const finish = data.choices?.[0]?.finish_reason;
      console.log(`[LLM] Response length: ${content.length}, finish: ${finish}`);

      if (content && content.trim().length > 0) return content;

      // Empty response — retry
      console.log(`[LLM] Empty response, retrying...`);
      lastError = new Error("LLM returned empty response");
      continue;
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        lastError = new Error("LLM request timed out after 90s");
        continue;
      }
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error("LLM failed after all retries");
}

export function parseJSON(text: string): any {
  // Try to find JSON in the response (handles markdown code blocks too)
  // Match JSON arrays first, then objects
  const jsonMatch = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/)
    || text.match(/(\[[\s\S]*\])/)
    || text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
    || text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) {
    console.log(`[parseJSON] No JSON found in text:`, text.substring(0, 200));
    throw new Error("No JSON found in AI response");
  }
  const jsonStr = jsonMatch[1] || jsonMatch[0];
  console.log(`[parseJSON] Extracted JSON (first 200 chars):`, jsonStr.substring(0, 200));
  return JSON.parse(jsonStr);
}

function extractUrlFromText(text: string): string {
  const match = text.match(/https?:\/\/[^\s"'`]+/);
  return match ? match[0] : "";
}

export async function planTask(description: string) {
  const text = await callLLM(
    `Automate this: "${description}"

Respond with ONLY a JSON object, no markdown:
{"taskType":"SCRAPE","name":"task name","steps":[{"action":"navigate","target":"https://example.com","description":"step description"},{"action":"extract","target":"body","description":"get data"}]}

taskType: SCRAPE, FORM_FILL, SCREENSHOT, or CUSTOM.
Actions: navigate, click, fill, extract, screenshot, wait.`
  );

  try {
    return parseJSON(text);
  } catch {
    // AI returned non-JSON — build a plan from the description
    const url = extractUrlFromText(description) || extractUrlFromText(text);
    return {
      taskType: "SCRAPE",
      name: description.slice(0, 60),
      steps: url
        ? [
            { action: "navigate", target: url, description: `Navigate to ${url}` },
            { action: "extract", target: "body", description: "Extract page content" },
          ]
        : [{ action: "extract", target: "body", description: description }],
    };
  }
}

export async function analyzeUrl(url: string) {
  const text = await callLLM(
    `What CSS selectors extract data from ${url}?

Respond with ONLY a JSON object:
{"selectors":{"container":".product-card","fields":{"name":".title","price":".price"}},"suggestedName":"scrape products"}`
  );

  try {
    return parseJSON(text);
  } catch {
    return {
      selectors: { container: "body", fields: { text: "h1, h2, p" } },
      suggestedName: `Scrape ${new URL(url).hostname}`,
    };
  }
}

export async function analyzeForm(url: string) {
  const text = await callLLM(
    `What form fields exist at ${url}?

Respond with ONLY a JSON object:
{"fields":{"name":{"selector":"input[name='name']","type":"text","label":"Name"}},"submitButton":"button[type='submit']"}`
  );

  try {
    return parseJSON(text);
  } catch {
    return {
      fields: {
        name: { selector: "input[name='name']", type: "text", label: "Name" },
        email: { selector: "input[name='email']", type: "email", label: "Email" },
      },
      submitButton: "button[type='submit']",
    };
  }
}
