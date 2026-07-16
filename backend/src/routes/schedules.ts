import { Router, Request, Response } from "express";
import { prisma } from "../index";
import { addSchedule, removeSchedule, toggleSchedule } from "../services/scheduler";
import { sendEmail } from "../services/notifier";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const schedules = await prisma.schedule.findMany({
      include: { task: { select: { id: true, name: true, type: true, status: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ schedules });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { taskId, cronExpr, notifyEmail } = req.body;
    if (!taskId) return res.status(400).json({ error: "taskId is required" });
    if (!cronExpr) return res.status(400).json({ error: "cronExpr is required" });

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ error: "Task not found" });

    const schedule = await addSchedule(taskId, cronExpr, notifyEmail);
    res.status(201).json(schedule);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { enabled } = req.body;
    const schedule = await toggleSchedule(req.params.id, enabled);
    res.json(schedule);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await removeSchedule(req.params.id);
    res.json({ message: "Schedule deleted" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/:id/test-email", async (req: Request, res: Response) => {
  try {
    const schedule = await prisma.schedule.findUnique({ where: { id: req.params.id } });
    if (!schedule) return res.status(404).json({ error: "Schedule not found" });
    if (!schedule.notifyEmail) return res.status(400).json({ error: "No email configured" });

    const sent = await sendEmail(
      schedule.notifyEmail,
      "BrowserBot Test Email",
      `<h2>Test Email</h2><p>This is a test email from BrowserBot Scheduler.</p><p>If you received this, email notifications are working.</p>`
    );

    res.json({ sent });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
