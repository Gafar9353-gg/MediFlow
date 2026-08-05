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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-accent via-background to-secondary p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="items-center text-center">
          <span className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Stethoscope className="size-6" />
          </span>
          <CardTitle className="text-xl">MediStore ERP</CardTitle>
          <CardDescription>Sign in to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                autoComplete="username"
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full">
              Sign in
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Demo: admin / admin123 &nbsp;•&nbsp; staff / staff123
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
