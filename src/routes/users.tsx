import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, KeyRound, Trash2, Power } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/erp/AppShell";
import { Protected } from "@/components/erp/Protected";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useErp } from "@/lib/erp-store";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "User Management — MediStore ERP" },
      { name: "description", content: "Create staff accounts, reset passwords and control access." },
      { property: "og:title", content: "User Management — MediStore ERP" },
      { property: "og:description", content: "Manage staff accounts and access control." },
    ],
  }),
  component: () => (
    <Protected roles={["admin"]}>
      <UsersPage />
    </Protected>
  ),
});

function UsersPage() {
  const { data, currentUser, addUser, updateUser, deleteUser } = useErp();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetId, setResetId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  function create() {
    if (!username.trim()) return setError("Username is required");
    if (password.length < 6) return setError("Password must be at least 6 characters");
    const res = addUser(username, password, "staff");
    if (!res.ok) return setError(res.error ?? "Could not create user");
    toast.success("Staff account created");
    setOpen(false);
    setUsername("");
    setPassword("");
    setError("");
  }

  return (
    <AppShell
      title="User Management"
      subtitle="Staff accounts and access control"
      actions={
        <Button
          className="gap-2"
          onClick={() => {
            setUsername("");
            setPassword("");
            setError("");
            setOpen(true);
          }}
        >
          <Plus className="size-4" /> Add staff
        </Button>
      }
    >
      <Card>
        <CardContent className="overflow-x-auto pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.username}</TableCell>
                  <TableCell className="capitalize">{u.role}</TableCell>
                  <TableCell>
                    <Badge variant={u.active ? "secondary" : "destructive"}>
                      {u.active ? "Active" : "Deactivated"}
                    </Badge>
                  </TableCell>
                  <TableCell>{u.createdAt}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRenameId(u.id);
                        setRenameValue(u.username);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Reset password"
                      onClick={() => {
                        setResetId(u.id);
                        setNewPassword("");
                        setError("");
                      }}
                    >
                      <KeyRound className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Toggle active"
                      disabled={u.id === currentUser?.id}
                      onClick={() => {
                        updateUser(u.id, { active: !u.active });
                        toast.success(u.active ? "Account deactivated" : "Account activated");
                      }}
                    >
                      <Power className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete user"
                      disabled={u.id === currentUser?.id}
                      onClick={() => {
                        deleteUser(u.id);
                        toast.success("Account deleted");
                      }}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add staff account</DialogTitle>
            <DialogDescription>Staff can access purchase, inventory and billing.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Username *</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Password * (min 6 characters)</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={create}>Create account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetId} onOpenChange={(o) => !o && setResetId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>Set a new password for this account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>New password *</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (newPassword.length < 6) {
                  setError("Password must be at least 6 characters");
                  return;
                }
                if (resetId) updateUser(resetId, { password: newPassword });
                toast.success("Password reset");
                setResetId(null);
                setError("");
              }}
            >
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renameId} onOpenChange={(o) => !o && setRenameId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit account</DialogTitle>
            <DialogDescription>Change the username for this account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Username *</Label>
            <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!renameValue.trim()) {
                  toast.error("Username is required");
                  return;
                }
                if (renameId) updateUser(renameId, { username: renameValue.trim() });
                toast.success("Account updated");
                setRenameId(null);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
