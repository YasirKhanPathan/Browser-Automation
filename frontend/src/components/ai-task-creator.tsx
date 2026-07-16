"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, Send, Zap, CheckCircle2, AlertCircle } from "lucide-react";
import { tasksApi } from "@/services/api";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface TaskPlan {
  taskType: string;
  name: string;
  steps: { action: string; target: string; description: string }[];
}

export function AiTaskCreator() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [plan, setPlan] = useState<TaskPlan | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const handlePlan = async () => {
    if (!description.trim()) return toast.error("Describe what you want to automate");
    setLoading(true);
    setAiError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/ai/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();

      if (!res.ok) {
        setAiError(data.error || "AI is not available");
        toast.error("AI planning unavailable — use the feature pages directly");
        return;
      }

      setPlan(data);
      toast.success("AI generated a plan!");
    } catch (err: any) {
      setAiError(err.message);
      toast.error("AI is not configured yet");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickScrape = async () => {
    if (!description.trim()) return toast.error("Enter a URL or description");
    setExecuting(true);
    try {
      // Try to extract a URL from the description
      const urlMatch = description.match(/https?:\/\/[^\s]+/);
      const url = urlMatch ? urlMatch[0] : `https://${description.replace(/\s+/g, "")}`;

      const task = await tasksApi.create({
        name: `Quick Scrape: ${new URL(url).hostname}`,
        type: "SCRAPE",
        description,
        config: { url },
      });
      toast.success("Task created! Running...");
      const result = await tasksApi.execute(task.id);
      toast.success(`Done! Found ${result.data?.length || 0} items`);
      router.push("/results");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setExecuting(false);
    }
  };

  const handleExecute = async () => {
    if (!plan) return;
    setExecuting(true);
    try {
      // Extract URL from plan steps (find first navigate action)
      const navigateStep = plan.steps.find((s) => s.action === "navigate" && s.target.startsWith("http"));
      const url = navigateStep?.target || "";

      if (!url) {
        toast.error("Plan has no valid URL to navigate to. Please try a different description.");
        setExecuting(false);
        return;
      }

      const task = await tasksApi.create({
        name: plan.name,
        type: plan.taskType as any,
        description,
        config: { url, plan: plan.steps },
      });
      toast.success("Task created! Executing...");
      const result = await tasksApi.execute(task.id);
      toast.success(`Completed in ${result.duration}ms!`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Execution failed");
    } finally {
      setExecuting(false);
    }
  };

  return (
    <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-purple-500/5">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">Quick Task</h3>
            <p className="text-xs text-muted-foreground">Enter a URL or describe what you want</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ai-desc">URL or description</Label>
          <Textarea
            id="ai-desc"
            placeholder="e.g., https://example.com or 'scrape product names from amazon'"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleQuickScrape} disabled={executing || !description.trim()} variant="gradient" className="flex-1">
            {executing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {executing ? "Running..." : "Quick Scrape"}
          </Button>
          <Button onClick={handlePlan} disabled={loading || !description.trim()} variant="outline" className="flex-1">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            AI Plan
          </Button>
        </div>

        {aiError && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-600 font-medium">AI not configured</p>
              <p className="text-muted-foreground text-xs mt-1">Set LLM_API_KEY in backend/.env to enable AI planning. Use Quick Scrape or the feature pages directly in the meantime.</p>
            </div>
          </div>
        )}

        {plan && (
          <div className="space-y-3 mt-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Generated Plan</h4>
              <Badge variant="outline">{plan.taskType}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{plan.name}</p>
            <div className="space-y-2">
              {plan.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border p-3 bg-background/50">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/10 text-violet-500 text-xs font-bold shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{step.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <Zap className="h-3 w-3 inline mr-1" />{step.action} &rarr; {step.target}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Button onClick={handleExecute} disabled={executing} className="w-full" variant="default">
              {executing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              {executing ? "Executing..." : "Execute This Plan"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
