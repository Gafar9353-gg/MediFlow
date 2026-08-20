import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Printer, Plus, Trash2, FilePlus2 } from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { inr, useErp } from "@/lib/erp-store";
import type { Bill, BillItem } from "@/lib/erp-types";

export const Route = createFileRoute("/billing")({
  head: () => ({
    meta: [
      { title: "Billing — MediStore ERP" },
      { name: "description", content: "Create customer bills, take cash or UPI payments and print invoices." },
      { property: "og:title", content: "Billing — MediStore ERP" },
      { property: "og:description", content: "Fast counter billing with printable GST invoices." },
    ],
  }),
  component: () => (
    <Protected roles={["admin", "staff"]}>
      <BillingPage />
    </Protected>
  ),
});

function BillingPage() {
  const { data, addBill } = useErp();
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<BillItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMode, setPaymentMode] = useState<"cash" | "upi">("cash");
  const [transactionId, setTransactionId] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [lastBill, setLastBill] = useState<Bill | null>(null);

  const matches = search.trim()
    ? data.medicines
        .filter((m) => m.name.toLowerCase().includes(search.trim().toLowerCase()) && m.stock > 0)
        .slice(0, 6)
    : [];

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const gstAmount = items.reduce((s, i) => s + (i.price * i.quantity * i.gst) / 100, 0);
  const total = subtotal + gstAmount;

  function addItem(medicineId: string) {
    const m = data.medicines.find((x) => x.id === medicineId);
    if (!m) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.medicineId === m.id);
      if (existing) {
        if (existing.quantity + 1 > m.stock) {
          toast.error(`Only ${m.stock} units of ${m.name} in stock`);
          return prev;
        }
        return prev.map((i) =>
          i.medicineId === m.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          medicineId: m.id,
          name: m.name,
          category: m.category || "Tablet",
          batchNo: m.batchNo,
          rack: m.rack,
          price: m.sellingPrice,
          gst: m.gst,
          quantity: 1,
        },
      ];
    });
    setSearch("");
  }

  function setQty(medicineId: string, qty: number) {
    const m = data.medicines.find((x) => x.id === medicineId);
    if (!m) return;
    if (qty > m.stock) {
      toast.error(`Only ${m.stock} units available`);
      qty = m.stock;
    }
    setItems((prev) =>
      prev.map((i) => (i.medicineId === medicineId ? { ...i, quantity: Math.max(1, qty) } : i)),
    );
  }

  function newBill() {
    setItems([]);
    setCustomerName("");
    setCustomerPhone("");
    setPaymentMode("cash");
    setTransactionId("");
    setErrors([]);
    setLastBill(null);
  }

  function save() {
    const errs: string[] = [];
    if (items.length === 0) errs.push("Add at least one medicine to the bill");
    if (paymentMode === "upi" && !transactionId.trim())
      errs.push("Transaction ID is required for UPI payments");
    if (customerPhone.trim() && !/^\d{10}$/.test(customerPhone.trim()))
      errs.push("Phone number must be 10 digits");
    setErrors(errs);
    if (errs.length) return;
    const bill = addBill({
      customerName,
      customerPhone,
      items,
      paymentMode,
      transactionId: paymentMode === "upi" ? transactionId.trim() : undefined,
    });
    setLastBill(bill);
    setItems([]);
    toast.success(`Bill ${bill.billNo} created — stock updated`);
  }

  return (
    <AppShell
      title="Billing"
      subtitle="Sell from live inventory"
      actions={
        <Button variant="outline" className="gap-2" onClick={newBill}>
          <FilePlus2 className="size-4" /> New bill
        </Button>
      }
    >
      <div className="grid gap-4 xl:grid-cols-3 print:hidden">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add medicines</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Search medicine by name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {matches.length > 0 && (
                <div className="mt-2 rounded-md border">
                  {matches.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => addItem(m.id)}
                      className="flex w-full items-center justify-between gap-3 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-accent"
                    >
                      <span className="font-medium">{m.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {m.category || ""} • Rack {m.rack} • Stock {m.stock} • {inr(m.sellingPrice)}
                      </span>
                      <Plus className="size-4" />
                    </button>
                  ))}
                </div>
              )}
              {search.trim() && matches.length === 0 && (
                <p className="mt-2 text-sm text-muted-foreground">No medicine in stock matches.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bill items</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medicine</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Rack</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">GST</TableHead>
                    <TableHead className="w-28">Qty</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((i) => (
                    <TableRow key={i.medicineId}>
                      <TableCell className="font-medium">{i.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{i.category}</Badge>
                      </TableCell>
                      <TableCell>{i.batchNo}</TableCell>
                      <TableCell>{i.rack}</TableCell>
                      <TableCell className="text-right">{inr(i.price)}</TableCell>
                      <TableCell className="text-right">{i.gst}%</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          value={i.quantity}
                          onChange={(e) => setQty(i.medicineId, Number(e.target.value))}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {inr(i.price * i.quantity * (1 + i.gst / 100))}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Remove"
                          onClick={() => setItems(items.filter((x) => x.medicineId !== i.medicineId))}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && (
                    <TableRow>
                       <TableCell colSpan={9} className="text-center text-muted-foreground">
                        No items in this bill
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Customer & payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cname">Customer name</Label>
              <Input id="cname" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cphone">Phone</Label>
              <Input
                id="cphone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="10-digit number"
              />
            </div>
            <div className="space-y-2">
              <Label>Payment mode</Label>
              <RadioGroup
                value={paymentMode}
                onValueChange={(v) => setPaymentMode(v as "cash" | "upi")}
                className="flex gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="cash" id="pay-cash" />
                  <Label htmlFor="pay-cash">Cash</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="upi" id="pay-upi" />
                  <Label htmlFor="pay-upi">UPI</Label>
                </div>
              </RadioGroup>
            </div>
            {paymentMode === "upi" && (
              <div className="space-y-2">
                <Label htmlFor="txn">Transaction ID *</Label>
                <Input id="txn" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} />
              </div>
            )}
            <div className="space-y-1 border-t pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{inr(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST</span>
                <span>{inr(gstAmount)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>{inr(total)}</span>
              </div>
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
            <Button className="w-full" onClick={save}>
              Generate bill
            </Button>
          </CardContent>
        </Card>
      </div>

      {lastBill && <InvoiceView bill={lastBill} />}
    </AppShell>
  );
}

function InvoiceView({ bill }: { bill: Bill }) {
  return (
    <Card className="mt-6 print:border-0 print:shadow-none">
      <CardContent className="pt-6">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <p className="text-sm text-muted-foreground">Bill {bill.billNo} generated</p>
          <Button className="gap-2" onClick={() => window.print()}>
            <Printer className="size-4" /> Print invoice
          </Button>
        </div>
        <div id="invoice" className="mx-auto max-w-2xl">
          <div className="border-b pb-3 text-center">
            <h2 className="text-xl font-bold">Vasuki Clinic</h2>
            <p className="text-xs text-muted-foreground">GST Invoice</p>
          </div>
          <div className="grid grid-cols-2 gap-2 py-3 text-sm">
            <p>
              <strong>Bill No:</strong> {bill.billNo}
            </p>
            <p className="text-right">
              <strong>Date:</strong> {new Date(bill.date).toLocaleString("en-IN")}
            </p>
            <p>
              <strong>Customer:</strong> {bill.customerName}
            </p>
            <p className="text-right">
              <strong>Phone:</strong> {bill.customerPhone || "—"}
            </p>
            <p>
              <strong>Payment:</strong> {bill.paymentMode.toUpperCase()}
              {bill.transactionId ? ` (Txn ${bill.transactionId})` : ""}
            </p>
            <p className="text-right">
              <strong>Billed by:</strong> {bill.createdBy}
            </p>
          </div>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-y text-left">
                <th className="py-2">Item</th>
                <th>Category</th>
                <th>Batch</th>
                <th>Rack</th>
                <th className="text-right">Rate</th>
                <th className="text-right">GST</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {bill.items.map((i) => (
                <tr key={i.medicineId} className="border-b">
                  <td className="py-2">{i.name}</td>
                  <td>{i.category}</td>
                  <td>{i.batchNo}</td>
                  <td>{i.rack}</td>
                  <td className="text-right">{inr(i.price)}</td>
                  <td className="text-right">{i.gst}%</td>
                  <td className="text-right">{i.quantity}</td>
                  <td className="text-right">{inr(i.price * i.quantity * (1 + i.gst / 100))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="ml-auto mt-3 w-full max-w-xs space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{inr(bill.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>GST</span>
              <span>{inr(bill.gstAmount)}</span>
            </div>
            <div className="flex justify-between border-t pt-1 font-semibold">
              <span>Grand total</span>
              <span>{inr(bill.total)}</span>
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Thank you for visiting Vasuki Clinic. Get well soon!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
