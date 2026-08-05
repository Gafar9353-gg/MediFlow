import { createFileRoute } from "@tanstack/react-router";
import { Pill, AlertTriangle, ShoppingCart, Receipt } from "lucide-react";
import { AppShell } from "@/components/erp/AppShell";
import { Protected } from "@/components/erp/Protected";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { inr, useErp, LOW_STOCK } from "@/lib/erp-store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — MediStore ERP" },
      { name: "description", content: "Live pharmacy overview: stock, purchases and sales today." },
      { property: "og:title", content: "Dashboard — MediStore ERP" },
      { property: "og:description", content: "Live pharmacy overview of stock, purchases and sales." },
    ],
  }),
  component: () => (
    <Protected roles={["admin", "staff"]}>
      <DashboardPage />
    </Protected>
  ),
});

function DashboardPage() {
  const { data } = useErp();
  const today = new Date().toISOString().slice(0, 10);
  const lowStock = data.medicines.filter((m) => m.stock < LOW_STOCK);
  const todayPurchases = data.purchases.filter((p) => p.date.slice(0, 10) === today);
  const todayBills = data.bills.filter((b) => b.date.slice(0, 10) === today);

  const stats = [
    {
      label: "Total medicines",
      value: String(data.medicines.length),
      icon: Pill,
      hint: `${data.medicines.reduce((s, m) => s + m.stock, 0)} units in stock`,
    },
    {
      label: "Low stock items",
      value: String(lowStock.length),
      icon: AlertTriangle,
      hint: `Below ${LOW_STOCK} units`,
    },
    {
      label: "Today's purchases",
      value: inr(todayPurchases.reduce((s, p) => s + p.total, 0)),
      icon: ShoppingCart,
      hint: `${todayPurchases.length} invoice(s)`,
    },
    {
      label: "Today's sales",
      value: inr(todayBills.reduce((s, b) => s + b.total, 0)),
      icon: Receipt,
      hint: `${todayBills.length} bill(s)`,
    },
  ];

  return (
    <AppShell title="Dashboard" subtitle="Overview of your medical store">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-start justify-between gap-3 pt-6">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-2xl font-semibold">{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
              </div>
              <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <s.icon className="size-5" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.purchases.slice(0, 6).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.supplierName}</TableCell>
                    <TableCell>{p.invoiceNumber}</TableCell>
                    <TableCell>{p.date}</TableCell>
                    <TableCell className="text-right">{inr(p.total)}</TableCell>
                  </TableRow>
                ))}
                {data.purchases.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No purchases recorded yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent sales</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.bills.slice(0, 6).map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.billNo}</TableCell>
                    <TableCell>{b.customerName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="uppercase">
                        {b.paymentMode}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{inr(b.total)}</TableCell>
                  </TableRow>
                ))}
                {data.bills.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No sales recorded yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
