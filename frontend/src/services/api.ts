const API_BASE = "";

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const tasksApi = {
  list: (params?: { type?: string; status?: string }) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch(`/api/tasks${qs}`);
  },
  get: (id: string) => apiFetch(`/api/tasks/${id}`),
  create: (data: { name: string; type: string; description: string; config?: any }) =>
    apiFetch("/api/tasks", { method: "POST", body: JSON.stringify(data) }),
  execute: (id: string) =>
    apiFetch(`/api/tasks/${id}/execute`, { method: "POST" }),
  delete: (id: string) =>
    apiFetch(`/api/tasks/${id}`, { method: "DELETE" }),
};

export const scrapeApi = {
  analyze: (url: string) =>
    apiFetch("/api/scrape/analyze", { method: "POST", body: JSON.stringify({ url }) }),
  execute: (taskId: string, url: string, selectors: any) =>
    apiFetch("/api/scrape/execute", { method: "POST", body: JSON.stringify({ taskId, url, selectors }) }),
};

export const formsApi = {
  analyze: (url: string) =>
    apiFetch("/api/forms/analyze", { method: "POST", body: JSON.stringify({ url }) }),
  execute: (taskId: string, url: string, fields: any) =>
    apiFetch("/api/forms/execute", { method: "POST", body: JSON.stringify({ taskId, url, fields }) }),
};

export const screenshotsApi = {
  capture: (taskId: string, url: string, options?: { fullPage?: boolean }) =>
    apiFetch("/api/screenshots/capture", { method: "POST", body: JSON.stringify({ taskId, url, ...options }) }),
  list: (taskId: string) => apiFetch(`/api/screenshots/${taskId}`),
};

export const aiApi = {
  plan: (description: string) =>
    apiFetch("/api/ai/plan", { method: "POST", body: JSON.stringify({ description }) }),
  analyzePage: (url: string) =>
    apiFetch("/api/ai/analyze-page", { method: "POST", body: JSON.stringify({ url }) }),
};
