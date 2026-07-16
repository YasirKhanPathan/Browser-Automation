const API_BASE = "";

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function apiFetch(path: string, options?: RequestInit) {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("Session expired. Please log in again.");
  }

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
  smart: (url: string, description: string) =>
    apiFetch("/api/scrape/smart", { method: "POST", body: JSON.stringify({ url, description }) }),
  crawl: (url: string, options: { description?: string; maxPages?: number; strategy?: string; nextSelector?: string }) =>
    apiFetch("/api/scrape/crawl", { method: "POST", body: JSON.stringify({ url, ...options }) }),
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

export const schedulesApi = {
  list: () => apiFetch("/api/schedules"),
  create: (data: { taskId: string; cronExpr: string; notifyEmail?: string }) =>
    apiFetch("/api/schedules", { method: "POST", body: JSON.stringify(data) }),
  toggle: (id: string, enabled: boolean) =>
    apiFetch(`/api/schedules/${id}`, { method: "PATCH", body: JSON.stringify({ enabled }) }),
  delete: (id: string) =>
    apiFetch(`/api/schedules/${id}`, { method: "DELETE" }),
  testEmail: (id: string) =>
    apiFetch(`/api/schedules/${id}/test-email`, { method: "POST" }),
};

export const webhooksApi = {
  list: (taskId?: string) => {
    const qs = taskId ? `?taskId=${taskId}` : "";
    return apiFetch(`/api/webhooks${qs}`);
  },
  create: (data: { taskId: string; url: string; secret?: string; events?: string[] }) =>
    apiFetch("/api/webhooks", { method: "POST", body: JSON.stringify(data) }),
  toggle: (id: string, enabled: boolean) =>
    apiFetch(`/api/webhooks/${id}`, { method: "PATCH", body: JSON.stringify({ enabled }) }),
  delete: (id: string) =>
    apiFetch(`/api/webhooks/${id}`, { method: "DELETE" }),
  test: (id: string) =>
    apiFetch(`/api/webhooks/${id}/test`, { method: "POST" }),
};

export const publicApi = {
  generateKey: (taskId: string) =>
    apiFetch(`/api/public/generate-key/${taskId}`, { method: "POST" }),
};

export const exportApi = {
  download: (taskId: string, format: "csv" | "json") => {
    const token = getAuthToken();
    window.open(`/api/tasks/${taskId}/export?format=${format}`, "_blank");
  },
  copyJson: async (taskId: string) => {
    const token = getAuthToken();
    const res = await fetch(`/api/tasks/${taskId}/export?format=json`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json();
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    return data;
  },
  toSheets: (taskId: string, spreadsheetId?: string) =>
    apiFetch(`/api/tasks/${taskId}/export/sheets`, {
      method: "POST",
      body: JSON.stringify({ spreadsheetId }),
    }),
};
