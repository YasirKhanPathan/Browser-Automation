import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { PrismaClient } from "@prisma/client";
import taskRoutes from "./routes/tasks";
import scrapeRoutes from "./routes/scrape";
import formRoutes from "./routes/forms";
import screenshotRoutes from "./routes/screenshots";
import aiRoutes from "./routes/ai";

export const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/tasks", taskRoutes);
app.use("/api/scrape", scrapeRoutes);
app.use("/api/forms", formRoutes);
app.use("/api/screenshots", screenshotRoutes);
app.use("/api/ai", aiRoutes);

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

export default app;
