import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "An error occurred";
    return Promise.reject(new Error(message));
  }
);

export const tasksApi = {
  list: (params?: { type?: string; status?: string }) =>
    api.get("/api/tasks", { params }).then((r) => r.data),

  get: (id: string) =>
    api.get(`/api/tasks/${id}`).then((r) => r.data),

  create: (data: { name: string; type: string; description: string }) =>
    api.post("/api/tasks", data).then((r) => r.data),

  execute: (id: string) =>
    api.post(`/api/tasks/${id}/execute`).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/api/tasks/${id}`).then((r) => r.data),
};

export const scrapeApi = {
  analyze: (url: string) =>
    api.post("/api/scrape/analyze", { url }).then((r) => r.data),

  execute: (taskId: string, url: string, selectors: any) =>
    api.post("/api/scrape/execute", { taskId, url, selectors }).then((r) => r.data),
};

export const formsApi = {
  analyze: (url: string) =>
    api.post("/api/forms/analyze", { url }).then((r) => r.data),

  execute: (taskId: string, url: string, fields: any) =>
    api.post("/api/forms/execute", { taskId, url, fields }).then((r) => r.data),
};

export const screenshotsApi = {
  capture: (taskId: string, url: string, options?: { fullPage?: boolean }) =>
    api.post("/api/screenshots/capture", { taskId, url, ...options }).then((r) => r.data),

  list: (taskId: string) =>
    api.get(`/api/screenshots/${taskId}`).then((r) => r.data),
};

export const aiApi = {
  plan: (description: string) =>
    api.post("/api/ai/plan", { description }).then((r) => r.data),

  analyzePage: (url: string) =>
    api.post("/api/ai/analyze-page", { url }).then((r) => r.data),
};

export default api;
