import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldAlert } from "lucide-react";
import { useErp } from "@/lib/erp-store";
import type { Role } from "@/lib/erp-types";

export function Protected({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { ready, currentUser } = useErp();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && !currentUser) navigate({ to: "/", replace: true });
  }, [ready, currentUser, navigate]);

  if (!ready || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!roles.includes(currentUser.role)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <ShieldAlert className="size-10 text-destructive" />
        <h2 className="text-lg font-semibold">Access denied</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Your role ({currentUser.role}) does not have permission to view this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
