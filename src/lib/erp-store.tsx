import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  Bill,
  BillItem,
  Customer,
  ErpData,
  Medicine,
  Purchase,
  PurchaseItem,
  Role,
  User,
} from "./erp-types";

const STORAGE_KEY = "medstore-erp-v1";
const SESSION_KEY = "medstore-erp-session";

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const today = () => new Date().toISOString().slice(0, 10);

function seedData(): ErpData {
  const admin: User = {
    id: uid(),
    username: "admin",
    password: "admin123",
    role: "admin",
    active: true,
    createdAt: today(),
  };
  const staff: User = {
    id: uid(),
    username: "staff",
    password: "staff123",
    role: "staff",
    active: true,
    createdAt: today(),
  };
  const mk = (
    name: string,
    batchNo: string,
    expiryDays: number,
    pp: number,
    sp: number,
    gst: number,
    stock: number,
    rack: string,
  ): Medicine => ({
    id: uid(),
    name,
    batchNo,
    expiryDate: new Date(Date.now() + expiryDays * 86400000).toISOString().slice(0, 10),
    purchasePrice: pp,
    sellingPrice: sp,
    gst,
    stock,
    rack,
  });
  const medicines: Medicine[] = [
    mk("Paracetamol 500mg", "PC-1042", 400, 12, 18, 5, 120, "A-1"),
    mk("Amoxicillin 250mg", "AM-2210", 180, 45, 62, 12, 40, "A-2"),
    mk("Cetirizine 10mg", "CT-3301", 20, 8, 14, 5, 8, "B-1"),
    mk("Metformin 500mg", "MF-5510", 320, 22, 35, 12, 75, "B-3"),
    mk("Cough Syrup 100ml", "CS-7781", 95, 60, 88, 18, 6, "C-2"),
  ];
  const customers: Customer[] = [
    { id: uid(), name: "Ravi Kumar", phone: "9876543210", createdAt: today() },
    { id: uid(), name: "Anita Sharma", phone: "9812345678", createdAt: today() },
  ];
  return { users: [admin, staff], medicines, purchases: [], bills: [], customers };
}

interface ErpContextValue {
  ready: boolean;
  data: ErpData;
  currentUser: User | null;
  login: (username: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  addPurchase: (input: {
    supplierName: string;
    invoiceNumber: string;
    date: string;
    items: PurchaseItem[];
  }) => Purchase;
  updateMedicine: (id: string, patch: Partial<Medicine>) => void;
  deleteMedicine: (id: string) => void;
  addBill: (input: {
    customerName: string;
    customerPhone: string;
    items: BillItem[];
    paymentMode: "cash" | "upi";
    transactionId?: string | undefined;
  }) => Bill;
  addCustomer: (name: string, phone: string) => Customer;
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  addUser: (username: string, password: string, role: Role) => { ok: boolean; error?: string };
  updateUser: (id: string, patch: Partial<User>) => void;
  deleteUser: (id: string) => void;
  replaceAll: (next: ErpData) => void;
  resetSeed: () => void;
}

const ErpContext = createContext<ErpContextValue | null>(null);

export function ErpProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ErpData>(() => ({
    users: [],
    medicines: [],
    purchases: [],
    bills: [],
    customers: [],
  }));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let loaded: ErpData | null = null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) loaded = JSON.parse(raw) as ErpData;
    } catch {
      loaded = null;
    }
    const initial = loaded && Array.isArray(loaded.users) && loaded.users.length ? loaded : seedData();
    setData(initial);
    try {
      const sessionId = window.localStorage.getItem(SESSION_KEY);
      const found = sessionId ? initial.users.find((u) => u.id === sessionId) : null;
      if (found && found.active) setCurrentUser(found);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }, [data, ready]);

  const login = useCallback<ErpContextValue["login"]>(
    (username, password) => {
      const user = data.users.find(
        (u) => u.username.toLowerCase() === username.trim().toLowerCase(),
      );
      if (!user || user.password !== password) return { ok: false, error: "Invalid username or password" };
      if (!user.active) return { ok: false, error: "This account is deactivated" };
      setCurrentUser(user);
      try {
        window.localStorage.setItem(SESSION_KEY, user.id);
      } catch {
        /* ignore */
      }
      return { ok: true };
    },
    [data.users],
  );

  const logout = useCallback(() => {
    setCurrentUser(null);
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const addPurchase = useCallback<ErpContextValue["addPurchase"]>(
    (input) => {
      const subtotal = input.items.reduce((s, i) => s + i.purchasePrice * i.quantity, 0);
      const gstAmount = input.items.reduce(
        (s, i) => s + (i.purchasePrice * i.quantity * i.gst) / 100,
        0,
      );
      const purchase: Purchase = {
        id: uid(),
        supplierName: input.supplierName,
        invoiceNumber: input.invoiceNumber,
        date: input.date,
        items: input.items,
        subtotal: round(subtotal),
        gstAmount: round(gstAmount),
        total: round(subtotal + gstAmount),
        createdBy: currentUser?.username ?? "system",
      };
      setData((prev) => {
        const medicines = [...prev.medicines];
        for (const item of purchase.items) {
          const idx = medicines.findIndex((m) => m.id === item.medicineId);
          const existing = idx >= 0 ? medicines[idx] : undefined;
          if (existing) {
            medicines[idx] = {
              ...existing,
              stock: existing.stock + item.quantity,
              batchNo: item.batchNo || existing.batchNo,
              expiryDate: item.expiryDate || existing.expiryDate,
              purchasePrice: item.purchasePrice,
              sellingPrice: item.sellingPrice,
              gst: item.gst,
              rack: item.rack || existing.rack,
            };
          } else {
            medicines.push({
              id: item.medicineId,
              name: item.name,
              batchNo: item.batchNo,
              expiryDate: item.expiryDate,
              purchasePrice: item.purchasePrice,
              sellingPrice: item.sellingPrice,
              gst: item.gst,
              stock: item.quantity,
              rack: item.rack,
            });
          }
        }
        return { ...prev, medicines, purchases: [purchase, ...prev.purchases] };
      });
      return purchase;
    },
    [currentUser],
  );

  const updateMedicine = useCallback<ErpContextValue["updateMedicine"]>((id, patch) => {
    setData((prev) => ({
      ...prev,
      medicines: prev.medicines.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  }, []);

  const deleteMedicine = useCallback((id: string) => {
    setData((prev) => ({ ...prev, medicines: prev.medicines.filter((m) => m.id !== id) }));
  }, []);

  const addBill = useCallback<ErpContextValue["addBill"]>(
    (input) => {
      const subtotal = input.items.reduce((s, i) => s + i.price * i.quantity, 0);
      const gstAmount = input.items.reduce((s, i) => s + (i.price * i.quantity * i.gst) / 100, 0);
      let bill!: Bill;
      setData((prev) => {
        let customerId: string | null = null;
        let customers = prev.customers;
        const phone = input.customerPhone.trim();
        const name = input.customerName.trim();
        if (phone || name) {
          const existing = prev.customers.find((c) => phone && c.phone === phone);
          if (existing) {
            customerId = existing.id;
          } else {
            const created: Customer = {
              id: uid(),
              name: name || "Walk-in",
              phone,
              createdAt: today(),
            };
            customers = [created, ...prev.customers];
            customerId = created.id;
          }
        }
        bill = {
          id: uid(),
          billNo: "INV-" + String(prev.bills.length + 1).padStart(4, "0"),
          date: new Date().toISOString(),
          customerId,
          customerName: name || "Walk-in",
          customerPhone: phone,
          items: input.items,
          subtotal: round(subtotal),
          gstAmount: round(gstAmount),
          total: round(subtotal + gstAmount),
          paymentMode: input.paymentMode,
          transactionId: input.transactionId,
          createdBy: currentUser?.username ?? "system",
        };
        const medicines = prev.medicines.map((m) => {
          const item = input.items.find((i) => i.medicineId === m.id);
          return item ? { ...m, stock: Math.max(0, m.stock - item.quantity) } : m;
        });
        return { ...prev, customers, medicines, bills: [bill, ...prev.bills] };
      });
      return bill;
    },
    [currentUser],
  );

  const addCustomer = useCallback<ErpContextValue["addCustomer"]>((name, phone) => {
    const customer: Customer = { id: uid(), name, phone, createdAt: today() };
    setData((prev) => ({ ...prev, customers: [customer, ...prev.customers] }));
    return customer;
  }, []);

  const updateCustomer = useCallback<ErpContextValue["updateCustomer"]>((id, patch) => {
    setData((prev) => ({
      ...prev,
      customers: prev.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }, []);

  const deleteCustomer = useCallback((id: string) => {
    setData((prev) => ({ ...prev, customers: prev.customers.filter((c) => c.id !== id) }));
  }, []);

  const addUser = useCallback<ErpContextValue["addUser"]>(
    (username, password, role) => {
      if (data.users.some((u) => u.username.toLowerCase() === username.trim().toLowerCase())) {
        return { ok: false, error: "Username already exists" };
      }
      const user: User = {
        id: uid(),
        username: username.trim(),
        password,
        role,
        active: true,
        createdAt: today(),
      };
      setData((prev) => ({ ...prev, users: [...prev.users, user] }));
      return { ok: true };
    },
    [data.users],
  );

  const updateUser = useCallback<ErpContextValue["updateUser"]>((id, patch) => {
    setData((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === id ? { ...u, ...patch } : u)),
    }));
  }, []);

  const deleteUser = useCallback((id: string) => {
    setData((prev) => ({ ...prev, users: prev.users.filter((u) => u.id !== id) }));
  }, []);

  const replaceAll = useCallback((next: ErpData) => setData(next), []);
  const resetSeed = useCallback(() => setData(seedData()), []);

  const value = useMemo<ErpContextValue>(
    () => ({
      ready,
      data,
      currentUser,
      login,
      logout,
      addPurchase,
      updateMedicine,
      deleteMedicine,
      addBill,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      addUser,
      updateUser,
      deleteUser,
      replaceAll,
      resetSeed,
    }),
    [
      ready,
      data,
      currentUser,
      login,
      logout,
      addPurchase,
      updateMedicine,
      deleteMedicine,
      addBill,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      addUser,
      updateUser,
      deleteUser,
      replaceAll,
      resetSeed,
    ],
  );

  return <ErpContext.Provider value={value}>{children}</ErpContext.Provider>;
}

export function useErp() {
  const ctx = useContext(ErpContext);
  if (!ctx) throw new Error("useErp must be used within ErpProvider");
  return ctx;
}

export function round(n: number) {
  return Math.round(n * 100) / 100;
}

export function inr(n: number) {
  return "₹" + round(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

export const LOW_STOCK = 10;
export const EXPIRY_WARN_DAYS = 30;
