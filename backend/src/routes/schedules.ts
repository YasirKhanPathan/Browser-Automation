import { Router, Request, Response } from "express";
import { prisma } from "../index";
import { addSchedule, removeSchedule, toggleSchedule } from "../services/scheduler";
import { sendEmail } from "../services/notifier";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const schedules = await prisma.schedule.findMany({
      where: { userId: authReq.userId },
      include: { task: { select: { id: true, name: true, type: true, status: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ schedules });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { taskId, cronExpr, notifyEmail } = req.body;
    if (!taskId) return res.status(400).json({ error: "taskId is required" });
    if (!cronExpr) return res.status(400).json({ error: "cronExpr is required" });

    const task = await prisma.task.findFirst({ where: { id: taskId, userId: authReq.userId } });
    if (!task) return res.status(404).json({ error: "Task not found" });

    const schedule = await addSchedule(authReq.userId!, taskId, cronExpr, notifyEmail);
    res.status(201).json(schedule);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const schedule = await prisma.schedule.findFirst({
      where: { id: req.params.id, userId: authReq.userId },
    });
    if (!schedule) return res.status(404).json({ error: "Schedule not found" });

    const { enabled } = req.body;
    const updated = await toggleSchedule(req.params.id, enabled);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const schedule = await prisma.schedule.findFirst({
      where: { id: req.params.id, userId: authReq.userId },
    });
    if (!schedule) return res.status(404).json({ error: "Schedule not found" });

    await removeSchedule(req.params.id);
    res.json({ message: "Schedule deleted" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/:id/test-email", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const schedule = await prisma.schedule.findFirst({
      where: { id: req.params.id, userId: authReq.userId },
    });
    if (!schedule) return res.status(404).json({ error: "Schedule not found" });
    if (!schedule.notifyEmail) return res.status(400).json({ error: "No notification email configured on this schedule" });

    const sent = await sendEmail(
      schedule.notifyEmail,
      "BrowserBot Test Email",
      `<h2>Test Email</h2><p>This is a test email from BrowserBot Scheduler.</p><p>If you received this, email notifications are working.</p>`
    );

    res.json({ sent, message: "Test email sent successfully" });
  } catch (error: any) {
    // Distinguish between SMTP config issues and other errors
    if (error.message?.includes("SMTP not configured")) {
      return res.status(500).json({ error: "SMTP email server is not configured. Please set SMTP_USER and SMTP_PASS in the server .env file." });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;
