import { Router, Request, Response } from "express";
import { prisma } from "../index";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/:id/export", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { id } = req.params;
    const format = (req.query.format as string) || "json";

    const task = await prisma.task.findFirst({
      where: { id, userId: authReq.userId },
      include: { results: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    if (!task) return res.status(404).json({ error: "Task not found" });

    const data = task.results[0]?.data;
    if (!data) return res.status(404).json({ error: "No result data found" });

    if (format === "csv") {
      const rows = Array.isArray(data) ? data : [data];
      if (rows.length === 0) return res.status(404).json({ error: "No data to export" });

      const firstRow = rows[0] as any;
      const keys = Object.keys(firstRow).filter((k) => !k.startsWith("_"));
      const csv = [
        keys.join(","),
        ...rows.map((row: any) =>
          keys.map((k) => `"${String(row[k] ?? "").replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${task.name.replace(/[^a-z0-9]/gi, "_")}.csv"`);
      return res.send(csv);
    }

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${task.name.replace(/[^a-z0-9]/gi, "_")}.json"`);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/:id/export/sheets", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { id } = req.params;
    const { spreadsheetId } = req.body;

    const task = await prisma.task.findFirst({
      where: { id, userId: authReq.userId },
      include: { results: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    if (!task) return res.status(404).json({ error: "Task not found" });

    const data = task.results[0]?.data;
    if (!data) return res.status(404).json({ error: "No result data found" });

    if (!process.env.GOOGLE_SHEETS_CREDENTIALS) {
      return res.status(400).json({
        error: "Google Sheets not configured. Set GOOGLE_SHEETS_CREDENTIALS in backend/.env",
      });
    }

    res.json({
      message: "Google Sheets export — configure GOOGLE_SHEETS_CREDENTIALS to enable",
      taskId: id,
      rows: Array.isArray(data) ? data.length : 1,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
