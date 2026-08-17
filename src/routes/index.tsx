import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Stethoscope, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useErp } from "@/lib/erp-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — MediStore ERP" },
      { name: "description", content: "Sign in to MediStore ERP to manage pharmacy operations." },
      { property: "og:title", content: "Sign in — MediStore ERP" },
      { property: "og:description", content: "Secure access to your medical store ERP." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { ready, currentUser, login } = useErp();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (ready && currentUser) navigate({ to: "/dashboard", replace: true });
  }, [ready, currentUser, navigate]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Username and password are required");
      return;
    }
    const res = login(username, password);
    if (!res.ok) {
      setError(res.error ?? "Login failed");
      return;
    }
    setError("");
    navigate({ to: "/dashboard" });
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-900 px-4 py-12">
      {/* Medical-themed background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(255,255,255,0))]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />
      
      {/* Glowing accents */}
      <div className="absolute top-1/4 left-1/4 -z-10 h-72 w-72 rounded-full bg-emerald-500/10 blur-[128px]" />
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-72 w-72 rounded-full bg-sky-500/10 blur-[128px]" />

      <Card className="relative z-10 w-full max-w-sm border-slate-800 bg-slate-950/80 text-slate-100 shadow-2xl backdrop-blur-xl">
        <CardHeader className="items-center text-center pb-2">
          <span className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            <Stethoscope className="size-7" />
          </span>
          <CardTitle className="text-2xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            MediStore ERP
          </CardTitle>
          <CardDescription className="text-slate-400 mt-1">Pharmacy Management Portal</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">Username</Label>
              <Input
                id="username"
                value={username}
                autoComplete="username"
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="border-slate-800 bg-slate-900/50 text-slate-100 placeholder:text-slate-500 focus-visible:ring-emerald-500/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="border-slate-800 bg-slate-900/50 text-slate-100 placeholder:text-slate-500 focus-visible:ring-emerald-500/50"
              />
            </div>
            {error && (
              <Alert variant="destructive" className="border-red-900/50 bg-red-950/50 text-red-200">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full bg-emerald-600 font-semibold text-slate-50 hover:bg-emerald-500 shadow-[0_4px_12px_rgba(16,185,129,0.2)] transition-all">
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
