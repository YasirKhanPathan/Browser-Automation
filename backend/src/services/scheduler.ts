import cron from "node-cron";
import { prisma } from "../index";
import { runTask } from "./runner";
import { sendEmail, buildChangeNotification } from "./notifier";

const scheduledTasks = new Map<string, cron.ScheduledTask>();

function compareResults(oldData: any, newData: any): { field: string; old: any; new: any }[] {
  const changes: { field: string; old: any; new: any }[] = [];

  if (!oldData || !newData) return changes;

  const oldStr = JSON.stringify(oldData);
  const newStr = JSON.stringify(newData);

  if (oldStr === newStr) return changes;

  // Simple comparison: if arrays, compare lengths and first/last items
  if (Array.isArray(oldData) && Array.isArray(newData)) {
    if (oldData.length !== newData.length) {
      changes.push({ field: "item_count", old: oldData.length, new: newData.length });
    }
    // Compare first few items
    for (let i = 0; i < Math.min(oldData.length, newData.length, 3); i++) {
      const oldItem = JSON.stringify(oldData[i]);
      const newItem = JSON.stringify(newData[i]);
      if (oldItem !== newItem) {
        changes.push({ field: `item[${i}]`, old: oldData[i], new: newData[i] });
      }
    }
  } else if (typeof oldData === "object" && typeof newData === "object") {
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
    for (const key of allKeys) {
      if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
        changes.push({ field: key, old: oldData[key], new: newData[key] });
      }
    }
  } else if (oldData !== newData) {
    changes.push({ field: "value", old: oldData, new: newData });
  }

  return changes;
}

export async function startScheduler() {
  console.log("[Scheduler] Starting scheduler...");

  const schedules = await prisma.schedule.findMany({
    where: { enabled: true },
    include: { task: { select: { id: true, name: true, type: true } } },
  });

  for (const schedule of schedules) {
    if (cron.validate(schedule.cronExpr)) {
      const job = cron.schedule(schedule.cronExpr, async () => {
        await executeSchedule(schedule.id);
      });
      scheduledTasks.set(schedule.id, job);
      console.log(`[Scheduler] Scheduled: ${schedule.task.name} (${schedule.cronExpr})`);
    } else {
      console.error(`[Scheduler] Invalid cron expression: ${schedule.cronExpr} for schedule ${schedule.id}`);
    }
  }

  console.log(`[Scheduler] ${scheduledTasks.size} schedules active`);
}

export async function executeSchedule(scheduleId: string) {
  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
    include: { task: true },
  });

  if (!schedule || !schedule.enabled) return;

  console.log(`[Scheduler] Executing: ${schedule.task.name}`);

  try {
    // Get previous result for comparison
    const previousResult = await prisma.taskResult.findFirst({
      where: { taskId: schedule.taskId, status: "SUCCESS" },
      orderBy: { createdAt: "desc" },
    });

    // Execute the task
    const startTime = Date.now();
    const result = await runTask(schedule.task);
    const duration = Date.now() - startTime;

    // Store result and update schedule atomically
    const now = new Date();
    await prisma.$transaction([
      prisma.taskResult.create({
        data: {
          taskId: schedule.taskId,
          status: "SUCCESS",
          data: result,
          duration,
        },
      }),
      prisma.schedule.update({
        where: { id: scheduleId },
        data: { lastRun: now },
      }),
    ]);

    // Check for changes and send notification
    if (schedule.notifyEmail && previousResult?.data) {
      const changes = compareResults(previousResult.data, result);
      if (changes.length > 0) {
        const html = buildChangeNotification(schedule.task.name, changes);
        try {
          await sendEmail(schedule.notifyEmail, `Data Changed: ${schedule.task.name}`, html);
        } catch (emailErr: any) {
          console.error(`[Scheduler] Email notification failed:`, emailErr.message);
        }
      }
    }

    console.log(`[Scheduler] Completed: ${schedule.task.name} (${duration}ms)`);
  } catch (error: any) {
    console.error(`[Scheduler] Failed: ${schedule.task.name}:`, error.message);

    await prisma.taskResult.create({
      data: {
        taskId: schedule.taskId,
        status: "ERROR",
        errorMsg: error.message,
      },
    });
  }
}

export function stopScheduler() {
  for (const [id, job] of scheduledTasks) {
    job.stop();
  }
  scheduledTasks.clear();
  console.log("[Scheduler] Stopped all scheduled tasks");
}

export async function addSchedule(userId: string, taskId: string, cronExpr: string, notifyEmail?: string) {
  if (!cron.validate(cronExpr)) {
    throw new Error(`Invalid cron expression: ${cronExpr}`);
  }

  const schedule = await prisma.schedule.create({
    data: {
      userId,
      taskId,
      cronExpr,
      notifyEmail: notifyEmail || null,
    },
  });

  const job = cron.schedule(cronExpr, async () => {
    await executeSchedule(schedule.id);
  });

  scheduledTasks.set(schedule.id, job);
  console.log(`[Scheduler] Added schedule: ${schedule.id} (${cronExpr})`);

  return schedule;
}

export async function removeSchedule(scheduleId: string) {
  const job = scheduledTasks.get(scheduleId);
  if (job) {
    job.stop();
    scheduledTasks.delete(scheduleId);
  }

  await prisma.schedule.delete({ where: { id: scheduleId } });
  console.log(`[Scheduler] Removed schedule: ${scheduleId}`);
}

export async function toggleSchedule(scheduleId: string, enabled: boolean) {
  const schedule = await prisma.schedule.update({
    where: { id: scheduleId },
    data: { enabled },
  });

  if (enabled) {
    // Stop existing job if any before creating new one
    const existingJob = scheduledTasks.get(scheduleId);
    if (existingJob) {
      existingJob.stop();
    }
    if (cron.validate(schedule.cronExpr)) {
      const job = cron.schedule(schedule.cronExpr, async () => {
        await executeSchedule(schedule.id);
      });
      scheduledTasks.set(schedule.id, job);
    }
  } else {
    const job = scheduledTasks.get(scheduleId);
    if (job) {
      job.stop();
      scheduledTasks.delete(scheduleId);
    }
  }

  return schedule;
}
