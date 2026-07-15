const LLM_API_URL = process.env.LLM_API_URL || "http://localhost:19999/v1/chat/completions";
const LLM_MODEL = process.env.LLM_MODEL || "xiaomimimo/mimo-v2.5";
const LLM_API_KEY = process.env.LLM_API_KEY || "";

async function callLLM(prompt: string): Promise<string> {
  if (!LLM_API_KEY) {
    throw new Error("LLM API key not configured. Set LLM_API_KEY in backend/.env");
  }

  const response = await fetch(LLM_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM API error (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

function parseJSON(text: string): any {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in AI response");
  return JSON.parse(jsonMatch[0]);
}

export async function planTask(description: string) {
  const prompt = `You are an AI browser automation planner. Given a user's plain English description, generate a structured automation plan.

User request: "${description}"

Respond with ONLY a JSON object (no markdown, no explanation) with this exact structure:
{
  "taskType": "SCRAPE" or "FORM_FILL" or "SCREENSHOT" or "CUSTOM",
  "name": "short descriptive name for this task",
  "steps": [
    {
      "action": "navigate" or "click" or "fill" or "extract" or "screenshot" or "wait",
      "target": "CSS selector or URL",
      "value": "optional value to fill or extract",
      "description": "human-readable description of this step"
    }
  ]
}`;

  const text = await callLLM(prompt);
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
  const prompt = `Visit the website at ${url} and identify what data can be extracted from it.

Respond with ONLY a JSON object (no markdown, no explanation):
{
  "selectors": {
    "container": "CSS selector for the main data container (e.g. .product-card, tr, article)",
    "fields": {
      "fieldName": "CSS selector for each data field relative to the container"
    }
  },
  "suggestedName": "descriptive name for this scraping task",
  "dataPreview": ["example value 1", "example value 2"]
}

If you cannot determine the selectors, provide your best guess based on common HTML patterns.`;

  const text = await callLLM(prompt);
  try {
    return parseJSON(text);
  } catch {
    return {
      selectors: { container: "body", fields: { text: "p, h1, h2, h3" } },
      suggestedName: `Scrape ${new URL(url).hostname}`,
      dataPreview: [],
    };
  }
}

export async function analyzeForm(url: string) {
  const prompt = `Analyze the form at ${url} and identify all form fields.

Respond with ONLY a JSON object (no markdown, no explanation):
{
  "fields": {
    "fieldName": {
      "selector": "CSS selector for the input",
      "type": "text or email or password or textarea or select or checkbox",
      "label": "visible label text"
    }
  },
  "submitButton": "CSS selector for submit button"
}

If you cannot determine the exact selectors, provide your best guess based on common form patterns (input[name='fieldname'], input[type='email'], etc).`;

  const text = await callLLM(prompt);
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
