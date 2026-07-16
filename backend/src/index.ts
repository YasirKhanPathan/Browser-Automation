import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import { PrismaClient } from "@prisma/client";
import taskRoutes from "./routes/tasks";
import scrapeRoutes from "./routes/scrape";
import formRoutes from "./routes/forms";
import screenshotRoutes from "./routes/screenshots";
import aiRoutes from "./routes/ai";
import scheduleRoutes from "./routes/schedules";
import webhookRoutes from "./routes/webhooks";
import publicRoutes from "./routes/public";
import exportRoutes from "./routes/export";
import { startScheduler } from "./services/scheduler";

export const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/tasks", taskRoutes);
app.use("/api/tasks", exportRoutes);
app.use("/api/scrape", scrapeRoutes);
app.use("/api/forms", formRoutes);
app.use("/api/screenshots", screenshotRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/public", publicRoutes);

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  startScheduler().catch(console.error);
});

export default app;
