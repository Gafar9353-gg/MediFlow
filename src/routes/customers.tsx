import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import { inr, useErp } from "@/lib/erp-store";

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [
      { title: "Customers — MediStore ERP" },
      { name: "description", content: "Customer directory with phone numbers and purchase history." },
      { property: "og:title", content: "Customers — MediStore ERP" },
      { property: "og:description", content: "Customer directory and purchase history." },
    ],
  }),
  component: () => (
    <Protected roles={["admin"]}>
      <CustomersPage />
    </Protected>
  ),
});

function CustomersPage() {
  const { data, addCustomer, updateCustomer, deleteCustomer } = useErp();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [historyId, setHistoryId] = useState<string | null>(null);

  const rows = data.customers.filter(
    (c) =>
      c.name.toLowerCase().includes(query.trim().toLowerCase()) || c.phone.includes(query.trim()),
  );

  function submit() {
    if (!name.trim()) return setError("Name is required");
    if (!/^\d{10}$/.test(phone.trim())) return setError("Phone must be a 10-digit number");
    if (editId) {
      updateCustomer(editId, { name: name.trim(), phone: phone.trim() });
      toast.success("Customer updated");
    } else {
      addCustomer(name.trim(), phone.trim());
      toast.success("Customer added");
    }
    setOpen(false);
    setError("");
    setName("");
    setPhone("");
    setEditId(null);
  }

  const historyBills = historyId ? data.bills.filter((b) => b.customerId === historyId) : [];
  const historyCustomer = data.customers.find((c) => c.id === historyId);

  return (
    <AppShell
      title="Customers"
      subtitle="Directory and purchase history"
      actions={
        <Button
          className="gap-2"
          onClick={() => {
            setEditId(null);
            setName("");
            setPhone("");
            setError("");
            setOpen(true);
          }}
        >
          <Plus className="size-4" /> Add customer
        </Button>
      }
    >
      <Card>
        <CardContent className="pt-6">
          <Input
            placeholder="Search by name or phone…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-sm"
          />
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Bills</TableHead>
                  <TableHead className="text-right">Total spent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => {
                  const bills = data.bills.filter((b) => b.customerId === c.id);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.phone}</TableCell>
                      <TableCell className="text-right">{bills.length}</TableCell>
                      <TableCell className="text-right">
                        {inr(bills.reduce((s, b) => s + b.total, 0))}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button variant="outline" size="sm" onClick={() => setHistoryId(c.id)}>
                          History
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Edit customer"
                          onClick={() => {
                            setEditId(c.id);
                            setName(c.name);
                            setPhone(c.phone);
                            setError("");
                            setOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete customer"
                          onClick={() => {
                            deleteCustomer(c.id);
                            toast.success("Customer deleted");
                          }}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No customers found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit customer" : "Add customer"}</DialogTitle>
            <DialogDescription>Customer records are used for purchase history.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyId} onOpenChange={(o) => !o && setHistoryId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Purchase history — {historyCustomer?.name}</DialogTitle>
            <DialogDescription>{historyCustomer?.phone}</DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyBills.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>{b.billNo}</TableCell>
                    <TableCell>{new Date(b.date).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell>{b.items.map((i) => i.name).join(", ")}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="uppercase">
                        {b.paymentMode}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{inr(b.total)}</TableCell>
                  </TableRow>
                ))}
                {historyBills.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No purchases yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
