import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Download, Upload, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/erp/AppShell";
import { Protected } from "@/components/erp/Protected";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useErp } from "@/lib/erp-store";
import type { ErpData } from "@/lib/erp-types";

export const Route = createFileRoute("/backup")({
  head: () => ({
    meta: [
      { title: "Backup & Restore — MediStore ERP" },
      { name: "description", content: "Export all store data as JSON and restore it later." },
      { property: "og:title", content: "Backup & Restore — MediStore ERP" },
      { property: "og:description", content: "Export and import your store data as JSON." },
    ],
  }),
  component: () => (
    <Protected roles={["admin"]}>
      <BackupPage />
    </Protected>
  ),
});

function BackupPage() {
  const { data, replaceAll, resetSeed } = useErp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  function exportJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medistore-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup exported");
  }

  async function importJson(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as ErpData;
      const keys: (keyof ErpData)[] = ["users", "medicines", "purchases", "bills", "customers"];
      if (!keys.every((k) => Array.isArray(parsed[k]))) {
        setError("Invalid backup file: missing required sections.");
        return;
      }
      if (parsed.users.length === 0) {
        setError("Invalid backup file: at least one user account is required.");
        return;
      }
      replaceAll(parsed);
      setError("");
      toast.success("Backup restored");
    } catch {
      setError("Could not read this file. Please select a valid JSON backup.");
    }
  }

  return (
    <AppShell title="Backup & Restore" subtitle="Export or import all application data">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Export data</CardTitle>
            <CardDescription>
              Download medicines, purchases, bills, customers and users as a single JSON file.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="text-sm text-muted-foreground">
              <li>{data.medicines.length} medicines</li>
              <li>{data.purchases.length} purchases</li>
              <li>{data.bills.length} bills</li>
              <li>{data.customers.length} customers</li>
              <li>{data.users.length} users</li>
            </ul>
            <Button className="gap-2" onClick={exportJson}>
              <Download className="size-4" /> Export JSON
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import data</CardTitle>
            <CardDescription>Restoring replaces all current data. This cannot be undone.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importJson(file);
                e.target.value = "";
              }}
            />
            <Button variant="secondary" className="gap-2" onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" /> Import JSON
            </Button>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                resetSeed();
                toast.success("Data reset to demo seed");
              }}
            >
              <RotateCcw className="size-4" /> Reset to demo data
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
