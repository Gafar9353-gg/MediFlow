import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CreditCard, Check } from "lucide-react";
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

  function markAsPaid(purchase: Purchase) {
    if (purchase.isPaid) return; // already paid — no action
    updatePurchase(purchase.id, { isPaid: true });
    toast.success(`Purchase ${purchase.invoiceNumber} marked as Paid`);
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
                      {p.isPaid ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          className="cursor-not-allowed opacity-60"
                        >
                          <span className="flex items-center gap-1"><Check className="size-3.5 text-emerald-500" /> Paid ✓</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-500 text-slate-50"
                          onClick={() => markAsPaid(p)}
                        >
                          <span className="flex items-center gap-1"><CreditCard className="size-3.5" /> Mark as Paid</span>
                        </Button>
                      )}
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
