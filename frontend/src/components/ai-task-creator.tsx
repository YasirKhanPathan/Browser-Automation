"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, Send, Zap, CheckCircle2 } from "lucide-react";
import { aiApi, tasksApi } from "@/services/api";
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

  const handlePlan = async () => {
    if (!description.trim()) return toast.error("Describe what you want to automate");
    setLoading(true);
    try {
      const result = await aiApi.plan(description);
      setPlan(result);
      toast.success("AI generated a plan!");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate plan");
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!plan) return;
    setExecuting(true);
    try {
      const task = await tasksApi.create({
        name: plan.name,
        type: plan.taskType as any,
        description: description,
      });
      toast.success("Task created! Executing...");

      const result = await tasksApi.execute(task.id);
      toast.success(`Task completed in ${result.duration}ms!`);
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
            <h3 className="font-semibold">AI Task Creator</h3>
            <p className="text-xs text-muted-foreground">Describe what you want in plain English</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ai-desc">What do you want to automate?</Label>
          <Textarea
            id="ai-desc"
            placeholder='e.g., "Go to example.com and extract all product names and prices"'
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <Button onClick={handlePlan} disabled={loading} variant="gradient" className="w-full">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Generate Plan with AI
        </Button>

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
