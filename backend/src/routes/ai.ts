import { Router, Request, Response } from "express";
import { planTask, analyzeUrl } from "../services/ai";

const router = Router();

router.post("/plan", async (req: Request, res: Response) => {
  try {
    const { description } = req.body;
    if (!description) return res.status(400).json({ error: "Description is required" });

    const plan = await planTask(description);
    res.json(plan);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/analyze-page", async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    const analysis = await analyzeUrl(url);
    res.json(analysis);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
