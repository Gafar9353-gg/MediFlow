import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/erp/AppShell";
import { Protected } from "@/components/erp/Protected";
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
import { cn } from "@/lib/utils";
import { daysUntil, inr, useErp, EXPIRY_WARN_DAYS, LOW_STOCK } from "@/lib/erp-store";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — MediStore ERP" },
      { name: "description", content: "Read-only stock view with low-stock and expiry warnings." },
      { property: "og:title", content: "Inventory — MediStore ERP" },
      { property: "og:description", content: "Track stock levels, low stock and expiring batches." },
    ],
  }),
  component: () => (
    <Protected roles={["admin", "staff"]}>
      <InventoryPage />
    </Protected>
  ),
});

function InventoryPage() {
  const { data } = useErp();
  const [query, setQuery] = useState("");
  const rows = data.medicines.filter((m) =>
    m.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const lowCount = data.medicines.filter((m) => m.stock < LOW_STOCK).length;
  const expiringCount = data.medicines.filter((m) => daysUntil(m.expiryDate) <= EXPIRY_WARN_DAYS).length;

  return (
    <AppShell
      title="Inventory"
      subtitle="Read-only stock overview"
      actions={
        <div className="hidden gap-2 sm:flex">
          <Badge variant="destructive">{lowCount} low stock</Badge>
          <Badge variant="secondary">{expiringCount} expiring soon</Badge>
        </div>
      }
    >
      <Card>
        <CardContent className="pt-6">
          <Input
            placeholder="Search inventory…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-sm"
          />
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Rack</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Stock value</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((m) => {
                  const days = daysUntil(m.expiryDate);
                  const low = m.stock < LOW_STOCK;
                  const expiring = days <= EXPIRY_WARN_DAYS;
                  return (
                    <TableRow key={m.id} className={cn(low && "bg-destructive/5")}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>{m.batchNo}</TableCell>
                      <TableCell>{m.rack}</TableCell>
                      <TableCell>{m.expiryDate}</TableCell>
                      <TableCell className="text-right">{m.stock}</TableCell>
                      <TableCell className="text-right">{inr(m.stock * m.purchasePrice)}</TableCell>
                      <TableCell className="space-x-1 whitespace-nowrap">
                        {low && <Badge variant="destructive">Low stock</Badge>}
                        {expiring && (
                          <Badge variant="outline">
                            {days < 0 ? "Expired" : `Expires in ${days}d`}
                          </Badge>
                        )}
                        {!low && !expiring && <Badge variant="secondary">Healthy</Badge>}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No stock found
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
