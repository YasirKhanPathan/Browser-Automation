"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Zap,
} from "lucide-react";
import { tasksApi, aiApi } from "@/services/api";
import toast from "react-hot-toast";

interface Task {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface TaskSelectorProps {
  /** Currently selected taskId */
  value: string;
  /** Called when a task is selected (existing or newly created) */
  onChange: (taskId: string) => void;
  /** List of tasks to show in the dropdown */
  tasks: Task[];
  /** If true, only show completed tasks (for schedules) */
  filterCompleted?: boolean;
  /** Placeholder for the new task textarea */
  placeholder?: string;
}

export function TaskSelector({
  value,
  onChange,
  tasks,
  filterCompleted = false,
  placeholder = "e.g., Scrape product prices from amazon.com",
}: TaskSelectorProps) {
  const [tab, setTab] = useState<string>(value ? "existing" : "new");
  const [description, setDescription] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<{
    name: string;
    type: string;
    description: string;
  } | null>(null);
  const [creating, setCreating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const filteredTasks = filterCompleted
    ? tasks.filter((t) => t.status === "COMPLETED")
    : tasks;

  const handleSuggest = useCallback(async () => {
    if (!description.trim()) return toast.error("Enter a description first");
    setSuggesting(true);
    setAiError(null);
    try {
      const plan = await aiApi.plan(description);
      setSuggestion({
        name: plan.name || description.slice(0, 60),
        type: plan.taskType || "SCRAPE",
        description,
      });
    } catch (err: any) {
      setAiError(err.message || "AI is not available");
      toast.error("AI suggestion failed — you can still create the task manually");
    } finally {
      setSuggesting(false);
    }
  }, [description]);

  const handleUseSuggestion = useCallback(async () => {
    if (!suggestion) return;
    setCreating(true);
    try {
      const task = await tasksApi.create({
        name: suggestion.name,
        type: suggestion.type,
        description: suggestion.description,
      });
      toast.success(`Task "${task.name}" created`);
      setSuggestion(null);
      setDescription("");
      onChange(task.id);
      setTab("existing");
    } catch (err: any) {
      toast.error(err.message || "Failed to create task");
    } finally {
      setCreating(false);
    }
  }, [suggestion, onChange]);

  const handleCreateDirect = useCallback(async () => {
    if (!description.trim()) return toast.error("Enter a description");
    setCreating(true);
    try {
      const task = await tasksApi.create({
        name: description.slice(0, 80),
        type: "SCRAPE",
        description,
      });
      toast.success(`Task "${task.name}" created`);
      setDescription("");
      onChange(task.id);
      setTab("existing");
    } catch (err: any) {
      toast.error(err.message || "Failed to create task");
    } finally {
      setCreating(false);
    }
  }, [description, onChange]);

  const selectedTask = tasks.find((t) => t.id === value);

  return (
    <div className="space-y-2">
      <Label>Task</Label>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="existing" className="flex-1">
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Existing Task
            {selectedTask && tab === "existing" && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                {selectedTask.name.slice(0, 20)}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="new" className="flex-1">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            New Task
          </TabsTrigger>
        </TabsList>

        <TabsContent value="existing">
          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">
              {filteredTasks.length === 0
                ? "No tasks available — use 'New Task' tab"
                : "Select a task..."}
            </option>
            {filteredTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.type})
              </option>
            ))}
          </select>
          {filteredTasks.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1.5">
              {filterCompleted
                ? "No completed tasks yet. Run a task first, or create a new one."
                : "No tasks yet. Switch to the 'New Task' tab to create one."}
            </p>
          )}
        </TabsContent>

        <TabsContent value="new" className="space-y-3">
          <Textarea
            placeholder={placeholder}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setSuggestion(null);
              setAiError(null);
            }}
            rows={2}
            className="min-h-[60px]"
          />

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleSuggest}
              disabled={suggesting || !description.trim()}
            >
              {suggesting ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 mr-1" />
              )}
              AI Suggest
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCreateDirect}
              disabled={creating || !description.trim()}
            >
              {creating ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5 mr-1" />
              )}
              Create
            </Button>
          </div>

          {aiError && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-600 font-medium">AI not available</p>
                <p className="text-muted-foreground mt-0.5">
                  {aiError}. You can still create the task manually using the "Create" button.
                </p>
              </div>
            </div>
          )}

          {suggestion && (
            <Card className="border-violet-500/20 bg-violet-500/5 animate-fade-in">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-violet-500" />
                    AI Suggestion
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => setSuggestion(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm font-medium">{suggestion.name}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {suggestion.type}
                  </Badge>
                  <p className="text-xs text-muted-foreground truncate">
                    {suggestion.description}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleUseSuggestion}
                  disabled={creating}
                  className="w-full"
                >
                  {creating ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  )}
                  {creating ? "Creating..." : "Use This Task"}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
