export type Role = "admin" | "staff";

export interface User {
  id: string;
  username: string;
  password: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export interface Medicine {
  id: string;
  name: string;
  batchNo: string;
  expiryDate: string;
  purchasePrice: number;
  sellingPrice: number;
  gst: number;
  stock: number;
  rack: string;
}

export interface PurchaseItem {
  medicineId: string;
  name: string;
  batchNo: string;
  expiryDate: string;
  purchasePrice: number;
  sellingPrice: number;
  gst: number;
  quantity: number;
  rack: string;
}

export interface Purchase {
  id: string;
  supplierName: string;
  invoiceNumber: string;
  date: string;
  items: PurchaseItem[];
  subtotal: number;
  gstAmount: number;
  total: number;
  createdBy: string;
  isPaid?: boolean;
}

export interface BillItem {
  medicineId: string;
  name: string;
  batchNo: string;
  rack: string;
  price: number;
  gst: number;
  quantity: number;
}

export interface Bill {
  id: string;
  billNo: string;
  date: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  items: BillItem[];
  subtotal: number;
  gstAmount: number;
  total: number;
  paymentMode: "cash" | "upi";
  transactionId?: string | undefined;
  createdBy: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
}

export interface ErpData {
  users: User[];
  medicines: Medicine[];
  purchases: Purchase[];
  bills: Bill[];
  customers: Customer[];
}
