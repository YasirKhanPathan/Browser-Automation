import { Router, Request, Response } from "express";
import { prisma } from "../index";
import { fillForm, detectFormFields } from "../services/scraper";

const router = Router();

router.post("/analyze", async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    // Detect form fields directly with Playwright (no AI needed)
    const analysis = await detectFormFields(url);

    const task = await prisma.task.create({
      data: {
        name: `Form Fill: ${new URL(url).hostname}`,
        type: "FORM_FILL",
        description: `Fill form on ${url}`,
        config: { url, fields: analysis.fields },
      },
    });

    res.json({ taskId: task.id, fields: analysis.fields, submitButton: analysis.submitButton });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/execute", async (req: Request, res: Response) => {
  try {
    const { taskId, url, fields } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });
    if (!fields) return res.status(400).json({ error: "Fields are required" });

    const result = await fillForm(url, fields);

    if (taskId && taskId !== "manual") {
      await prisma.taskResult.create({
        data: { taskId, status: "SUCCESS", data: result },
      });
      await prisma.task.update({
        where: { id: taskId },
        data: { status: "COMPLETED" },
      });
    }

    res.json({ ...result, taskId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
