import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/erp/AppShell";
import { Protected } from "@/components/erp/Protected";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { inr, uid, useErp } from "@/lib/erp-store";
import type { PurchaseItem } from "@/lib/erp-types";

export const Route = createFileRoute("/purchase")({
  head: () => ({
    meta: [
      { title: "Purchase Entry — MediStore ERP" },
      { name: "description", content: "Record supplier invoices and add or restock medicines." },
      { property: "og:title", content: "Purchase Entry — MediStore ERP" },
      { property: "og:description", content: "Record supplier invoices and restock medicines." },
    ],
  }),
  component: () => (
    <Protected roles={["admin", "staff"]}>
      <PurchasePage />
    </Protected>
  ),
});

const emptyLine = {
  medicineId: "",
  name: "",
  batchNo: "",
  expiryDate: "",
  purchasePrice: "",
  sellingPrice: "",
  gst: "12",
  quantity: "1",
  rack: "",
};

function PurchasePage() {
  const { data, addPurchase } = useErp();
  const [supplierName, setSupplierName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState("");
  const [line, setLine] = useState({ ...emptyLine });
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const matches = search.trim()
    ? data.medicines.filter((m) => m.name.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 5)
    : [];

  const subtotal = items.reduce((s, i) => s + i.purchasePrice * i.quantity, 0);
  const gstAmount = items.reduce((s, i) => s + (i.purchasePrice * i.quantity * i.gst) / 100, 0);

  function pickExisting(id: string) {
    const m = data.medicines.find((x) => x.id === id);
    if (!m) return;
    setLine({
      medicineId: m.id,
      name: m.name,
      batchNo: m.batchNo,
      expiryDate: m.expiryDate,
      purchasePrice: String(m.purchasePrice),
      sellingPrice: String(m.sellingPrice),
      gst: String(m.gst),
      quantity: "1",
      rack: m.rack,
    });
    setSearch("");
  }

  function addLine() {
    const errs: string[] = [];
    if (!line.name.trim()) errs.push("Medicine name is required");
    if (!line.batchNo.trim()) errs.push("Batch number is required");
    if (!line.expiryDate) errs.push("Expiry date is required");
    if (!(Number(line.purchasePrice) > 0)) errs.push("Purchase price must be greater than 0");
    if (!(Number(line.sellingPrice) > 0)) errs.push("MRP must be greater than 0");
    if (Number(line.gst) < 0) errs.push("GST % cannot be negative");
    if (!(Number(line.quantity) > 0)) errs.push("Quantity must be at least 1");
    setErrors(errs);
    if (errs.length) return;

    const existing = data.medicines.find(
      (m) => m.name.trim().toLowerCase() === line.name.trim().toLowerCase(),
    );
    setItems((prev) => [
      ...prev,
      {
        medicineId: line.medicineId || existing?.id || uid(),
        name: line.name.trim(),
        batchNo: line.batchNo.trim(),
        expiryDate: line.expiryDate,
        purchasePrice: Number(line.purchasePrice),
        sellingPrice: Number(line.sellingPrice),
        gst: Number(line.gst),
        quantity: Number(line.quantity),
        rack: line.rack.trim() || "—",
      },
    ]);
    setLine({ ...emptyLine });
  }

  function save() {
    const errs: string[] = [];
    if (!supplierName.trim()) errs.push("Supplier name is required");
    if (!invoiceNumber.trim()) errs.push("Invoice number is required");
    if (!date) errs.push("Date is required");
    if (items.length === 0) errs.push("Add at least one medicine to the purchase");
    setErrors(errs);
    if (errs.length) return;
    addPurchase({ supplierName: supplierName.trim(), invoiceNumber: invoiceNumber.trim(), date, items });
    toast.success("Purchase saved — inventory updated");
    setSupplierName("");
    setInvoiceNumber("");
    setItems([]);
    setLine({ ...emptyLine });
  }

  return (
    <AppShell title="Purchase Entry" subtitle="Medicines enter the system through purchases">
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Invoice details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier name *</Label>
              <Input
                id="supplier"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. Sunrise Pharma Distributors"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice">Invoice number *</Label>
              <Input
                id="invoice"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-2024-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bill summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{inr(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">GST</span>
              <span>{inr(gstAmount)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <span>Grand total</span>
              <span>{inr(subtotal + gstAmount)}</span>
            </div>
            <Button className="mt-2 w-full gap-2" onClick={save}>
              <Save className="size-4" /> Save purchase
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Add medicine</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search existing medicine</Label>
            <Input
              id="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type a medicine name to restock, or fill the form below to add new"
            />
            {matches.length > 0 && (
              <div className="rounded-md border bg-card">
                {matches.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => pickExisting(m.id)}
                    className="flex w-full items-center justify-between border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-accent"
                  >
                    <span>{m.name}</span>
                    <span className="text-xs text-muted-foreground">
                      Batch {m.batchNo} • Stock {m.stock} • {m.rack}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Name *" value={line.name} onChange={(v) => setLine({ ...line, name: v })} />
            <Field label="Batch No *" value={line.batchNo} onChange={(v) => setLine({ ...line, batchNo: v })} />
            <Field
              label="Expiry date *"
              type="date"
              value={line.expiryDate}
              onChange={(v) => setLine({ ...line, expiryDate: v })}
            />
            <Field
              label="Rack / Shelf"
              value={line.rack}
              onChange={(v) => setLine({ ...line, rack: v })}
            />
            <Field
              label="Purchase price *"
              type="number"
              value={line.purchasePrice}
              onChange={(v) => setLine({ ...line, purchasePrice: v })}
            />
            <Field
              label="MRP *"
              type="number"
              value={line.sellingPrice}
              onChange={(v) => setLine({ ...line, sellingPrice: v })}
            />
            <Field label="GST %" type="number" value={line.gst} onChange={(v) => setLine({ ...line, gst: v })} />
            <Field
              label="Quantity *"
              type="number"
              value={line.quantity}
              onChange={(v) => setLine({ ...line, quantity: v })}
            />
          </div>

          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                <ul className="list-inside list-disc">
                  {errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <Button variant="secondary" className="gap-2" onClick={addLine}>
            <Plus className="size-4" /> Add to purchase
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Purchase items</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicine</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Rack</TableHead>
                <TableHead className="text-right">Purchase</TableHead>
                <TableHead className="text-right">MRP</TableHead>
                <TableHead className="text-right">GST</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i, idx) => (
                <TableRow key={`${i.medicineId}-${idx}`}>
                  <TableCell className="font-medium">
                    {i.name}
                    {data.medicines.some((m) => m.id === i.medicineId) ? (
                      <Badge variant="secondary" className="ml-2">
                        Restock
                      </Badge>
                    ) : (
                      <Badge className="ml-2">New</Badge>
                    )}
                  </TableCell>
                  <TableCell>{i.batchNo}</TableCell>
                  <TableCell>{i.expiryDate}</TableCell>
                  <TableCell>{i.rack}</TableCell>
                  <TableCell className="text-right">{inr(i.purchasePrice)}</TableCell>
                  <TableCell className="text-right">{inr(i.sellingPrice)}</TableCell>
                  <TableCell className="text-right">{i.gst}%</TableCell>
                  <TableCell className="text-right">{i.quantity}</TableCell>
                  <TableCell className="text-right">{inr(i.purchasePrice * i.quantity)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setItems(items.filter((_, n) => n !== idx))}
                      aria-label="Remove item"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
                    No items added yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  const id = "f-" + label.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
