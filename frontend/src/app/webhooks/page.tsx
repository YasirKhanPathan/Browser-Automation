"use client";

import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Webhook, Loader2, AlertCircle, Plus, Trash2, Play, Key, Copy } from "lucide-react";
import { useState, useEffect } from "react";
import { webhooksApi, tasksApi, publicApi } from "@/services/api";
import toast from "react-hot-toast";

interface WebhookData {
  id: string;
  taskId: string;
  url: string;
  secret: string | null;
  events: string[];
  enabled: boolean;
  lastFired: string | null;
  task: { id: string; name: string };
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [events, setEvents] = useState<string[]>(["completed"]);
  const [creating, setCreating] = useState(false);
  const [showApiKey, setShowApiKey] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [hookData, taskData] = await Promise.all([
        webhooksApi.list(),
        tasksApi.list(),
      ]);
      setWebhooks(hookData.webhooks || []);
      setTasks(taskData.tasks || []);
    } catch (err: any) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedTask) return toast.error("Select a task");
    if (!webhookUrl) return toast.error("Enter a webhook URL");
    setCreating(true);
    try {
      await webhooksApi.create({
        taskId: selectedTask,
        url: webhookUrl,
        secret: secret || undefined,
        events,
      });
      toast.success("Webhook created!");
      setShowCreate(false);
      setSelectedTask("");
      setWebhookUrl("");
      setSecret("");
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await webhooksApi.toggle(id, enabled);
      toast.success(enabled ? "Webhook enabled" : "Webhook disabled");
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await webhooksApi.delete(id);
      toast.success("Webhook deleted");
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleTest = async (id: string) => {
    try {
      const result = await webhooksApi.test(id);
      toast.success(result.success ? "Test webhook sent!" : "Webhook test failed");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleGenerateKey = async (taskId: string) => {
    try {
      const result = await publicApi.generateKey(taskId);
      setApiKey(result.apiKey);
      setShowApiKey(taskId);
      toast.success("API key generated!");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    toast.success("API key copied!");
  };

  const toggleEvent = (event: string) => {
    setEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/25">
                <Webhook className="h-5 w-5 text-white" />
              </div>
              Webhooks & API
            </h1>
            <p className="text-muted-foreground mt-1">
              Get notified on task completion and access results programmatically
            </p>
          </div>
          <Button onClick={() => setShowCreate(!showCreate)} variant="gradient">
            <Plus className="h-4 w-4 mr-1" /> New Webhook
          </Button>
        </div>

        {showCreate && (
          <Card className="border-orange-500/20 animate-fade-in">
            <CardHeader>
              <CardTitle>Create Webhook</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Task</Label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={selectedTask}
                  onChange={(e) => setSelectedTask(e.target.value)}
                >
                  <option value="">Select a task...</option>
                  {tasks.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <Input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-server.com/webhook"
                />
              </div>

              <div className="space-y-2">
                <Label>Secret (optional, for HMAC signature)</Label>
                <Input
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="your-webhook-secret"
                />
              </div>

              <div className="space-y-2">
                <Label>Events</Label>
                <div className="flex gap-2">
                  {["completed", "failed", "changed"].map((event) => (
                    <Button
                      key={event}
                      size="sm"
                      variant={events.includes(event) ? "default" : "outline"}
                      onClick={() => toggleEvent(event)}
                    >
                      {event}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={creating || !selectedTask || !webhookUrl}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                  Create Webhook
                </Button>
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {showApiKey && (
          <Card className="border-blue-500/20 animate-fade-in">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">API Key Generated</p>
                  <p className="text-xs text-muted-foreground mt-1">Use this key to access task results via the public API</p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded">{apiKey}</code>
                  <Button size="sm" variant="outline" onClick={handleCopyKey}>
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowApiKey(null)}>Close</Button>
                </div>
              </div>
              <div className="mt-3 p-2 bg-muted/50 rounded text-xs">
                <p className="font-medium mb-1">Example usage:</p>
                <code>curl -H "X-API-Key: {apiKey}" https://browser-auto.22.jugaar.ai/api/public/results/{showApiKey}</code>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Loading webhooks...</p>
            </CardContent>
          </Card>
        ) : webhooks.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-12 text-center">
              <Webhook className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">No webhooks configured</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Create a webhook to get notified when tasks complete</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {webhooks.map((webhook) => (
              <Card key={webhook.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                        <Webhook className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{webhook.task.name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[300px]">{webhook.url}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={webhook.enabled ? "success" : "secondary"}>
                            {webhook.enabled ? "Active" : "Disabled"}
                          </Badge>
                          {webhook.events.map((e) => (
                            <Badge key={e} variant="outline" className="text-xs">{e}</Badge>
                          ))}
                          {webhook.lastFired && (
                            <span className="text-xs text-muted-foreground">
                              Last fired: {new Date(webhook.lastFired).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleTest(webhook.id)}>
                        <Play className="h-3 w-3 mr-1" /> Test
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleGenerateKey(webhook.taskId)}>
                        <Key className="h-3 w-3 mr-1" /> API Key
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleToggle(webhook.id, !webhook.enabled)}>
                        {webhook.enabled ? "Disable" : "Enable"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(webhook.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
