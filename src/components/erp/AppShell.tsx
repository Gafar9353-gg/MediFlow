import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ShoppingCart,
  Pill,
  Receipt,
  Boxes,
  Users,
  BarChart3,
  UserCog,
  LogOut,
  Menu,
  Stethoscope,
  User as UserIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useErp } from "@/lib/erp-store";
import type { Role } from "@/lib/erp-types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const NAV: { to: string; label: string; icon: typeof Pill; roles: Role[] }[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "staff"] },
  { to: "/purchase", label: "Purchase", icon: ShoppingCart, roles: ["admin", "staff"] },
  { to: "/supplier-payment", label: "Supplier Payment", icon: Receipt, roles: ["admin", "staff"] },
  { to: "/medicines", label: "Medicines", icon: Pill, roles: ["admin", "staff"] },
  { to: "/inventory", label: "Inventory", icon: Boxes, roles: ["admin", "staff"] },
  { to: "/billing", label: "Billing", icon: Receipt, roles: ["admin", "staff"] },
  { to: "/customers", label: "Customers", icon: Users, roles: ["admin"] },
  { to: "/reports", label: "Reports", icon: BarChart3, roles: ["admin"] },
  { to: "/users", label: "User Management", icon: UserCog, roles: ["admin"] },
];

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { currentUser, logout } = useErp();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const items = NAV.filter((n) => currentUser && n.roles.includes(currentUser.role));

  const isPurchaseTab = pathname === "/purchase";

  function handleLogout() {
    logout();
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen bg-muted/40">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform lg:static lg:translate-x-0 print:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Stethoscope className="size-5" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-sidebar-foreground">MediStore ERP</p>
            <p className="text-xs text-muted-foreground">Pharmacy Management</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        
        {/* Hide Sign out button from sidebar in purchase tab */}
        {!isPurchaseTab && (
          <div className="border-t border-sidebar-border p-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => setConfirmOpen(true)}
            >
              <LogOut className="size-4" /> Sign out
            </Button>
          </div>
        )}
      </aside>

      {open && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-foreground/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background px-4 lg:px-6 print:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </Button>

          {/* User Account Info on the LEFT side of the top bar */}
          <div className="flex items-center gap-2 border-r pr-4">
            <div className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <UserIcon className="size-4" />
            </div>
            <div className="hidden sm:block text-left leading-none">
              <p className="text-sm font-semibold">{currentUser?.username}</p>
              <Badge variant="outline" className="mt-0.5 px-1 py-0 text-[10px] uppercase tracking-wide">
                {currentUser?.role}
              </Badge>
            </div>
          </div>

          <div className="min-w-0 flex-1 pl-2">
            <h1 className="truncate text-lg font-semibold">{title}</h1>
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-2">
            {actions}
            {/* Show Sign out button on top bar if in purchase tab */}
            {isPurchaseTab && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => setConfirmOpen(true)}
              >
                <LogOut className="size-4" /> Sign out
              </Button>
            )}
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
      </div>

      {/* Confirmation Dialog for Log out */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
            <AlertDialogDescription>
              Any unsaved changes might be lost. You will need to sign in again to access the store ERP.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleLogout}>
              Yes, Log out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
