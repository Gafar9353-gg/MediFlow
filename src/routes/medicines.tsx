import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Trash2, Plus, Sliders } from "lucide-react";
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

const emptyMedicine = {
  name: "",
  batchNo: "",
  expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
  purchasePrice: 0,
  sellingPrice: 0,
  gst: 12,
  stock: 0,
  rack: "",
};

function MedicinesPage() {
  const { data, currentUser, addMedicine, updateMedicine, deleteMedicine } = useErp();
  const isAdmin = currentUser?.role === "admin";
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Medicine | null>(null);
  const [adjusting, setAdjusting] = useState<Medicine | null>(null);
  const [adjustValue, setAdjustValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newMed, setNewMed] = useState({ ...emptyMedicine });
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

  function handleAddMedicine() {
    if (!newMed.name.trim() || !newMed.batchNo.trim() || !newMed.expiryDate) {
      setError("Name, batch and expiry are required");
      return;
    }
    if (newMed.purchasePrice <= 0 || newMed.sellingPrice <= 0 || newMed.stock < 0) {
      setError("Prices must be greater than 0 and stock cannot be negative");
      return;
    }
    addMedicine(newMed);
    toast.success("Medicine added to store successfully");
    setIsAdding(false);
    setNewMed({ ...emptyMedicine });
    setError("");
  }

  function handleAdjustStock() {
    if (!adjusting) return;
    const newStock = Number(adjustValue);
    if (isNaN(newStock) || newStock < 0) {
      toast.error("Invalid stock value");
      return;
    }
    updateMedicine(adjusting.id, { stock: newStock });
    toast.success(`Stock level for ${adjusting.name} adjusted to ${newStock}`);
    setAdjusting(null);
    setAdjustValue("");
  }

  return (
    <AppShell
      title="Medicine Management"
      subtitle="View, create, adjust, or search medicines in store"
      actions={
        <Button className="gap-2" onClick={() => { setError(""); setNewMed({ ...emptyMedicine }); setIsAdding(true); }}>
          <Plus className="size-4" /> Add Medicine
        </Button>
      }
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
                  <TableHead className="text-right">Actions</TableHead>
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
                    <TableCell className="text-right whitespace-nowrap space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Adjust stock level"
                        onClick={() => {
                          setAdjusting(m);
                          setAdjustValue(String(m.stock));
                        }}
                      >
                        <Sliders className="size-4 text-emerald-600" />
                      </Button>
                      {isAdmin && (
                        <>
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
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      No medicines found. Use the Add Medicine button to create one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Adjust Stock Dialog */}
      <Dialog open={!!adjusting} onOpenChange={(o) => !o && setAdjusting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Medicine Stock</DialogTitle>
            <DialogDescription>
              Directly adjust the current stock level for <strong>{adjusting?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="adjust-stock">Stock Quantity</Label>
              <Input
                id="adjust-stock"
                type="number"
                min={0}
                value={adjustValue}
                onChange={(e) => setAdjustValue(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjusting(null)}>
              Cancel
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-slate-50" onClick={handleAdjustStock}>
              Update Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create New Medicine Dialog */}
      <Dialog open={isAdding} onOpenChange={(o) => !o && setIsAdding(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add / Create Medicine</DialogTitle>
            <DialogDescription>Create a new medicine master entry directly in the store inventory.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Medicine Name *</Label>
              <Input
                value={newMed.name}
                onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                placeholder="e.g. Ibuprofen 400mg"
              />
            </div>
            <div className="space-y-2">
              <Label>Batch Number *</Label>
              <Input
                value={newMed.batchNo}
                onChange={(e) => setNewMed({ ...newMed, batchNo: e.target.value })}
                placeholder="e.g. BT-9087"
              />
            </div>
            <div className="space-y-2">
              <Label>Expiry Date *</Label>
              <Input
                type="date"
                value={newMed.expiryDate}
                onChange={(e) => setNewMed({ ...newMed, expiryDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Rack / Shelf</Label>
              <Input
                value={newMed.rack}
                onChange={(e) => setNewMed({ ...newMed, rack: e.target.value })}
                placeholder="e.g. A-3"
              />
            </div>
            <div className="space-y-2">
              <Label>Purchase Price *</Label>
              <Input
                type="number"
                min={0}
                value={newMed.purchasePrice || ""}
                onChange={(e) => setNewMed({ ...newMed, purchasePrice: Number(e.target.value) })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Selling Price *</Label>
              <Input
                type="number"
                min={0}
                value={newMed.sellingPrice || ""}
                onChange={(e) => setNewMed({ ...newMed, sellingPrice: Number(e.target.value) })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>GST %</Label>
              <Input
                type="number"
                min={0}
                value={newMed.gst}
                onChange={(e) => setNewMed({ ...newMed, gst: Number(e.target.value) })}
                placeholder="12"
              />
            </div>
            <div className="space-y-2">
              <Label>Initial Stock</Label>
              <Input
                type="number"
                min={0}
                value={newMed.stock}
                onChange={(e) => setNewMed({ ...newMed, stock: Number(e.target.value) })}
                placeholder="0"
              />
            </div>
            {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-slate-50" onClick={handleAddMedicine}>
              Create Medicine
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
