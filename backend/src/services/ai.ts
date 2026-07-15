const LLM_API_URL = process.env.LLM_API_URL || "http://localhost:19999/v1/chat/completions";
const LLM_MODEL = process.env.LLM_MODEL || "xiaomimimo/mimo-v2.5";
const LLM_API_KEY = process.env.LLM_API_KEY || "";

async function callLLM(prompt: string): Promise<string> {
  if (!LLM_API_KEY) {
    throw new Error("LLM API key not configured. Set LLM_API_KEY in backend/.env");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const body = JSON.stringify({
      model: LLM_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 500,
    });
    console.log("[LLM] Request:", LLM_API_URL, "model:", LLM_MODEL, "prompt length:", prompt.length);

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
    console.log("[LLM] Response length:", content.length, "finish:", data.choices?.[0]?.finish_reason);
    return content;
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      throw new Error("LLM request timed out after 60s");
    }
    throw err;
  }
}

function parseJSON(text: string): any {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in AI response");
  return JSON.parse(jsonMatch[0]);
}

export async function planTask(description: string) {
  const text = await callLLM(`User wants to automate: "${description}"

Return ONLY this JSON (no markdown, no explanation):
{"taskType":"SCRAPE","name":"short name","steps":[{"action":"navigate","target":"https://example.com","description":"go to site"},{"action":"extract","target":"body","description":"get data"}]}

taskType must be one of: SCRAPE, FORM_FILL, SCREENSHOT, CUSTOM
Actions: navigate, click, fill, extract, screenshot, wait`);

  try {
    return parseJSON(text);
  } catch {
    return {
      taskType: "CUSTOM",
      name: "AI Planned Task",
      steps: [{ action: "navigate", target: "about:blank", description: text }],
    };
  }
}

export async function analyzeUrl(url: string) {
  const text = await callLLM(`What CSS selectors would extract data from ${url}?

Return ONLY this JSON:
{"selectors":{"container":".product-card","fields":{"name":".title","price":".price"}},"suggestedName":"scrape products"}`);

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
  const text = await callLLM(`What form fields exist at ${url}?

Return ONLY this JSON:
{"fields":{"name":{"selector":"input[name='name']","type":"text","label":"Name"}},"submitButton":"button[type='submit']"}`);

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
