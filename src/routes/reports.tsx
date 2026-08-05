import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/erp/AppShell";
import { Protected } from "@/components/erp/Protected";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { inr, useErp } from "@/lib/erp-store";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — MediStore ERP" },
      { name: "description", content: "Sales, purchase and stock value reports with date filters." },
      { property: "og:title", content: "Reports — MediStore ERP" },
      { property: "og:description", content: "Sales, purchase and stock value reporting." },
    ],
  }),
  component: () => (
    <Protected roles={["admin"]}>
      <ReportsPage />
    </Protected>
  ),
});

function ReportsPage() {
  const { data } = useErp();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const inRange = (dateStr: string) => {
    const d = dateStr.slice(0, 10);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  };

  const bills = data.bills.filter((b) => inRange(b.date));
  const purchases = data.purchases.filter((p) => inRange(p.date));
  const stockValue = data.medicines.reduce((s, m) => s + m.stock * m.purchasePrice, 0);
  const stockRetail = data.medicines.reduce((s, m) => s + m.stock * m.sellingPrice, 0);

  return (
    <AppShell title="Reports" subtitle="Sales, purchases and stock valuation">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Date filter</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="from">From</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to">To</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="purchase">Purchase</TabsTrigger>
          <TabsTrigger value="stock">Stock value</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <Card>
            <CardContent className="overflow-x-auto pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">GST</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>{b.billNo}</TableCell>
                      <TableCell>{new Date(b.date).toLocaleDateString("en-IN")}</TableCell>
                      <TableCell>{b.customerName}</TableCell>
                      <TableCell className="uppercase">{b.paymentMode}</TableCell>
                      <TableCell className="text-right">{inr(b.subtotal)}</TableCell>
                      <TableCell className="text-right">{inr(b.gstAmount)}</TableCell>
                      <TableCell className="text-right">{inr(b.total)}</TableCell>
                    </TableRow>
                  ))}
                  {bills.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No sales in this period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4}>Totals ({bills.length} bills)</TableCell>
                    <TableCell className="text-right">
                      {inr(bills.reduce((s, b) => s + b.subtotal, 0))}
                    </TableCell>
                    <TableCell className="text-right">
                      {inr(bills.reduce((s, b) => s + b.gstAmount, 0))}
                    </TableCell>
                    <TableCell className="text-right">
                      {inr(bills.reduce((s, b) => s + b.total, 0))}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchase">
          <Card>
            <CardContent className="overflow-x-auto pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">GST</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.invoiceNumber}</TableCell>
                      <TableCell>{p.supplierName}</TableCell>
                      <TableCell>{p.date}</TableCell>
                      <TableCell className="text-right">{p.items.length}</TableCell>
                      <TableCell className="text-right">{inr(p.subtotal)}</TableCell>
                      <TableCell className="text-right">{inr(p.gstAmount)}</TableCell>
                      <TableCell className="text-right">{inr(p.total)}</TableCell>
                    </TableRow>
                  ))}
                  {purchases.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No purchases in this period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4}>Totals ({purchases.length} invoices)</TableCell>
                    <TableCell className="text-right">
                      {inr(purchases.reduce((s, p) => s + p.subtotal, 0))}
                    </TableCell>
                    <TableCell className="text-right">
                      {inr(purchases.reduce((s, p) => s + p.gstAmount, 0))}
                    </TableCell>
                    <TableCell className="text-right">
                      {inr(purchases.reduce((s, p) => s + p.total, 0))}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock">
          <Card>
            <CardContent className="overflow-x-auto pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medicine</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Rack</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Cost value</TableHead>
                    <TableHead className="text-right">Retail value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.medicines.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>{m.batchNo}</TableCell>
                      <TableCell>{m.rack}</TableCell>
                      <TableCell className="text-right">{m.stock}</TableCell>
                      <TableCell className="text-right">{inr(m.stock * m.purchasePrice)}</TableCell>
                      <TableCell className="text-right">{inr(m.stock * m.sellingPrice)}</TableCell>
                    </TableRow>
                  ))}
                  {data.medicines.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No stock
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3}>Totals</TableCell>
                    <TableCell className="text-right">
                      {data.medicines.reduce((s, m) => s + m.stock, 0)}
                    </TableCell>
                    <TableCell className="text-right">{inr(stockValue)}</TableCell>
                    <TableCell className="text-right">{inr(stockRetail)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
