import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CreditCard, Check, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/erp/AppShell";
import { Protected } from "@/components/erp/Protected";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { inr, useErp } from "@/lib/erp-store";
import type { Purchase } from "@/lib/erp-types";

export const Route = createFileRoute("/supplier-payment")({
  head: () => ({
    meta: [
      { title: "Supplier Payments — MediStore ERP" },
      { name: "description", content: "Track supplier payments and purchase status." },
    ],
  }),
  component: () => (
    <Protected roles={["admin", "staff"]}>
      <SupplierPaymentPage />
    </Protected>
  ),
});

function SupplierPaymentPage() {
  const { data, updatePurchase } = useErp();
  const [query, setQuery] = useState("");

  const filteredPurchases = data.purchases.filter((p) =>
    p.supplierName.toLowerCase().includes(query.trim().toLowerCase()) ||
    p.invoiceNumber.toLowerCase().includes(query.trim().toLowerCase())
  );

  function togglePaymentStatus(purchase: Purchase) {
    const nextStatus = !purchase.isPaid;
    updatePurchase(purchase.id, { isPaid: nextStatus });
    toast.success(`Purchase ${purchase.invoiceNumber} status updated to ${nextStatus ? "Paid" : "Not Paid"}`);
  }

  return (
    <AppShell title="Supplier Payments" subtitle="Manage and record payments for supplier purchases">
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <Input
              placeholder="Search by supplier or invoice number…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Invoice No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchases.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.supplierName}</TableCell>
                    <TableCell>{p.invoiceNumber}</TableCell>
                    <TableCell>{p.date}</TableCell>
                    <TableCell className="text-right font-semibold">{inr(p.total)}</TableCell>
                    <TableCell className="capitalize">{p.createdBy}</TableCell>
                    <TableCell>
                      {p.isPaid ? (
                        <Badge className="bg-emerald-500 hover:bg-emerald-600">Paid</Badge>
                      ) : (
                        <Badge variant="destructive">Not Paid</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant={p.isPaid ? "outline" : "default"}
                        className={p.isPaid ? "" : "bg-emerald-600 hover:bg-emerald-500 text-slate-50"}
                        onClick={() => togglePaymentStatus(p)}
                      >
                        {p.isPaid ? (
                          <span className="flex items-center gap-1"><X className="size-3.5" /> Mark Unpaid</span>
                        ) : (
                          <span className="flex items-center gap-1"><Check className="size-3.5" /> Mark Paid</span>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPurchases.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No purchases found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
