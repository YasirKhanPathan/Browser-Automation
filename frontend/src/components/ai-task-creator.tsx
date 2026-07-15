"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, Send, Zap } from "lucide-react";
import { aiApi } from "@/services/api";
import toast from "react-hot-toast";

interface TaskPlan {
  taskType: string;
  name: string;
  steps: { action: string; target: string; description: string }[];
}

export function AiTaskCreator({ onExecute }: { onExecute?: (plan: TaskPlan) => void }) {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<TaskPlan | null>(null);

  const handlePlan = async () => {
    if (!description.trim()) return toast.error("Describe what you want to automate");
    setLoading(true);
    try {
      const result = await aiApi.plan(description);
      setPlan(result);
      toast.success("AI generated a plan!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
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
            placeholder='e.g., "Go to amazon.com, search for wireless headphones, and extract the top 5 results with names, prices, and ratings"'
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
                      <Zap className="h-3 w-3 inline mr-1" />{step.action} → {step.target}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {onExecute && (
              <Button onClick={() => onExecute(plan)} className="w-full" variant="default">
                <Send className="mr-2 h-4 w-4" /> Execute This Plan
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
