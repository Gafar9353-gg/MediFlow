import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { inr, useErp, LOW_STOCK } from "@/lib/erp-store";
import type { Medicine } from "@/lib/erp-types";

export const Route = createFileRoute("/medicines")({
  head: () => ({
    meta: [
      { title: "Medicines — MediStore ERP" },
      { name: "description", content: "Search and manage the medicine master list of your store." },
      { property: "og:title", content: "Medicines — MediStore ERP" },
      { property: "og:description", content: "Search and manage your medicine master list." },
    ],
  }),
  component: () => (
    <Protected roles={["admin", "staff"]}>
      <MedicinesPage />
    </Protected>
  ),
});

function MedicinesPage() {
  const { data, currentUser, updateMedicine, deleteMedicine } = useErp();
  const isAdmin = currentUser?.role === "admin";
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Medicine | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const rows = data.medicines.filter((m) =>
    m.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  function saveEdit() {
    if (!editing) return;
    if (!editing.name.trim() || !editing.batchNo.trim() || !editing.expiryDate) {
      setError("Name, batch and expiry are required");
      return;
    }
    if (editing.purchasePrice <= 0 || editing.sellingPrice <= 0 || editing.stock < 0) {
      setError("Prices must be greater than 0 and stock cannot be negative");
      return;
    }
    updateMedicine(editing.id, editing);
    toast.success("Medicine updated");
    setEditing(null);
    setError("");
  }

  return (
    <AppShell
      title="Medicine Management"
      subtitle={isAdmin ? "Edit or remove medicines" : "View and search medicines"}
    >
      <Card>
        <CardContent className="pt-6">
          <Input
            placeholder="Search medicines by name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-sm"
          />
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Purchase</TableHead>
                  <TableHead className="text-right">Selling</TableHead>
                  <TableHead className="text-right">GST</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Rack</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell>{m.batchNo}</TableCell>
                    <TableCell>{m.expiryDate}</TableCell>
                    <TableCell className="text-right">{inr(m.purchasePrice)}</TableCell>
                    <TableCell className="text-right">{inr(m.sellingPrice)}</TableCell>
                    <TableCell className="text-right">{m.gst}%</TableCell>
                    <TableCell className="text-right">
                      {m.stock < LOW_STOCK ? (
                        <Badge variant="destructive">{m.stock}</Badge>
                      ) : (
                        m.stock
                      )}
                    </TableCell>
                    <TableCell>{m.rack}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Edit medicine"
                          onClick={() => {
                            setEditing({ ...m });
                            setError("");
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete medicine"
                          onClick={() => setDeleteId(m.id)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 9 : 8} className="text-center text-muted-foreground">
                      No medicines found. Medicines are created through Purchase entries.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit medicine</DialogTitle>
            <DialogDescription>Update details for {editing?.name}</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Batch No</Label>
                <Input
                  value={editing.batchNo}
                  onChange={(e) => setEditing({ ...editing, batchNo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Expiry date</Label>
                <Input
                  type="date"
                  value={editing.expiryDate}
                  onChange={(e) => setEditing({ ...editing, expiryDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Rack / Shelf</Label>
                <Input
                  value={editing.rack}
                  onChange={(e) => setEditing({ ...editing, rack: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Purchase price</Label>
                <Input
                  type="number"
                  value={editing.purchasePrice}
                  onChange={(e) => setEditing({ ...editing, purchasePrice: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Selling price</Label>
                <Input
                  type="number"
                  value={editing.sellingPrice}
                  onChange={(e) => setEditing({ ...editing, sellingPrice: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>GST %</Label>
                <Input
                  type="number"
                  value={editing.gst}
                  onChange={(e) => setEditing({ ...editing, gst: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Stock</Label>
                <Input
                  type="number"
                  value={editing.stock}
                  onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })}
                />
              </div>
              {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this medicine?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the medicine from inventory and billing. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteMedicine(deleteId);
                setDeleteId(null);
                toast.success("Medicine deleted");
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
