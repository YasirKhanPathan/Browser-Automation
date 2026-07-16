"use client";

import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormInput, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { tasksApi, formsApi } from "@/services/api";
import toast from "react-hot-toast";

export default function FormsPage() {
  const [url, setUrl] = useState("");
  const [fields, setFields] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFill = async () => {
    if (!url) return toast.error("Please enter a URL");
    if (!fields) return toast.error("Please describe what to fill in");
    setLoading(true);
    setError(null);

    try {
      // Parse user input into field config
      const fieldEntries: Record<string, { selector: string; value: string }> = {};
      const lines = fields.split("\n").filter((l) => l.trim());
      lines.forEach((line, i) => {
        const parts = line.split(":").map((p) => p.trim());
        const name = parts[0] || `field_${i}`;
        const value = parts.slice(1).join(":") || "";
        fieldEntries[name] = {
          selector: `input[name='${name}'], input[placeholder*='${name}'], input:nth-of-type(${i + 1})`,
          value,
        };
      });

      // Create task
      const task = await tasksApi.create({
        name: `Form Fill: ${new URL(url).hostname}`,
        type: "FORM_FILL",
        description: `Fill form on ${url}`,
      });

      // Execute via the forms route with form data
      const data = await formsApi.execute(task.id, url, fieldEntries);

      setResult(data);
      toast.success("Form filled successfully!");
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg shadow-blue-500/25">
              <FormInput className="h-5 w-5 text-white" />
            </div>
            Form Filler
          </h1>
          <p className="text-muted-foreground mt-1">
            Fill web forms automatically — enter the URL and field values
          </p>
        </div>

        <Card className="border-border/50">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Form URL</Label>
              <Input
                id="url"
                placeholder="https://example.com/contact"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fields">Field values (one per line: name: value)</Label>
              <Textarea
                id="fields"
                placeholder={"name: John Doe\nemail: john@example.com\nmessage: Hello!"}
                value={fields}
                onChange={(e) => setFields(e.target.value)}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                Format: field_name: value (one per line). The AI will find the matching form inputs.
              </p>
            </div>
            <Button onClick={handleFill} disabled={loading || !url || !fields} variant="gradient" size="lg">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FormInput className="mr-2 h-4 w-4" />}
              {loading ? "Filling..." : "Fill Form"}
            </Button>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card className="border-border/50 animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Form Fill Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(result.filled || {}).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="font-medium text-sm">{key}</span>
                    <span className={`text-sm ${String(value).includes("failed") ? "text-destructive" : "text-emerald-500"}`}>
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
