import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function planTask(description: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `You are an AI browser automation planner. Given a user's plain English description, generate a structured automation plan.

User request: "${description}"

Respond with a JSON object (no markdown) with this exact structure:
{
  "taskType": "SCRAPE" | "FORM_FILL" | "SCREENSHOT" | "CUSTOM",
  "name": "short descriptive name",
  "steps": [
    {
      "action": "navigate" | "click" | "fill" | "extract" | "screenshot" | "wait",
      "target": "CSS selector or URL",
      "value": "optional value to fill or extract",
      "description": "human-readable description"
    }
  ]
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in AI response");
    return JSON.parse(jsonMatch[0]);
  } catch {
    return {
      taskType: "CUSTOM",
      name: "AI Planned Task",
      steps: [{ action: "navigate", target: "about:blank", description: text }],
    };
  }
}

export async function analyzeUrl(url: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `Analyze the website at ${url} and identify what data can be extracted.

Respond with a JSON object (no markdown):
{
  "selectors": {
    "container": "CSS selector for the main data container",
    "fields": {
      "fieldName": "CSS selector for each data field"
    }
  },
  "suggestedName": "descriptive name for this scraping task",
  "dataPreview": ["example value 1", "example value 2"]
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    return JSON.parse(jsonMatch[0]);
  } catch {
    return {
      selectors: { container: "body", fields: { text: "p, h1, h2, h3" } },
      suggestedName: `Scrape ${new URL(url).hostname}`,
      dataPreview: [],
    };
  }
}

export async function analyzeForm(url: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `Analyze the form at ${url} and identify all form fields.

Respond with a JSON object (no markdown):
{
  "fields": {
    "fieldName": {
      "selector": "CSS selector",
      "type": "text | email | password | textarea | select | checkbox",
      "label": "visible label text"
    }
  },
  "submitButton": "CSS selector for submit button"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    return JSON.parse(jsonMatch[0]);
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
