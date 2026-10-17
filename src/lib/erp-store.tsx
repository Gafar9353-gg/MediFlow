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
  MedicineCategory,
  Purchase,
  PurchaseItem,
  Role,
  User,
} from "./erp-types";

const SESSION_KEY = "medstore-erp-token";

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const today = () => new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// LocalStorage persistence keys
// ---------------------------------------------------------------------------
const DATA_KEY = "medstore-erp-data";
const USERS_KEY = "medstore-erp-users";

// ---------------------------------------------------------------------------
// Default seed users – stored in localStorage on first launch
// ---------------------------------------------------------------------------
const DEFAULT_USERS: User[] = [
  {
    id: "usr-admin-default",
    username: "admin",
    password: "admin123",
    role: "admin",
    active: true,
    createdAt: today(),
  },
  {
    id: "usr-staff-default",
    username: "staff",
    password: "staff123",
    role: "staff",
    active: true,
    createdAt: today(),
  },
];

function loadUsers(): User[] {
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as User[];
      // Ensure defaults always exist (in case they were accidentally wiped)
      const hasAdmin = parsed.some((u) => u.username === "admin");
      const hasStaff = parsed.some((u) => u.username === "staff");
      if (!hasAdmin || !hasStaff) {
        const merged = [...parsed];
        if (!hasAdmin) merged.push(DEFAULT_USERS[0]);
        if (!hasStaff) merged.push(DEFAULT_USERS[1]);
        window.localStorage.setItem(USERS_KEY, JSON.stringify(merged));
        return merged;
      }
      return parsed;
    }
  } catch {
    /* ignore */
  }
  // First run – seed default users
  window.localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
  return DEFAULT_USERS;
}

function saveUsers(users: User[]) {
  try {
    window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    /* ignore */
  }
}

function loadErpData(): Omit<ErpData, "users"> {
  try {
    const raw = window.localStorage.getItem(DATA_KEY);
    if (raw) return JSON.parse(raw) as Omit<ErpData, "users">;
  } catch {
    /* ignore */
  }
  return { medicines: [], purchases: [], bills: [], customers: [] };
}

function saveErpData(data: Omit<ErpData, "users">) {
  try {
    window.localStorage.setItem(
      DATA_KEY,
      JSON.stringify({
        medicines: data.medicines,
        purchases: data.purchases,
        bills: data.bills,
        customers: data.customers,
      })
    );
  } catch {
    /* ignore */
  }
}

function seedData(): ErpData {
  return { users: [], medicines: [], purchases: [], bills: [], customers: [] };
}

interface ErpContextValue {
  ready: boolean;
  data: ErpData;
  currentUser: User | null;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  addPurchase: (input: {
    supplierName: string;
    invoiceNumber: string;
    date: string;
    items: PurchaseItem[];
    isPaid?: boolean;
  }) => Purchase;
  updatePurchase: (id: string, patch: Partial<Purchase>) => void;
  addMedicine: (medicine: Omit<Medicine, "id">) => Medicine;
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
  const [data, setData] = useState<ErpData>(seedData());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  // -------------------------------------------------------------------------
  // Initialise from localStorage on mount
  // -------------------------------------------------------------------------
  useEffect(() => {
    const users = loadUsers();
    const erpData = loadErpData();

    const tokenRaw = window.localStorage.getItem(SESSION_KEY);
    let sessionUser: User | null = null;
    if (tokenRaw) {
      try {
        const { userId } = JSON.parse(atob(tokenRaw)) as { userId: string };
        sessionUser = users.find((u) => u.id === userId && u.active) ?? null;
      } catch {
        window.localStorage.removeItem(SESSION_KEY);
      }
    }

    setData({ ...erpData, users });
    setCurrentUser(sessionUser);
    setReady(true);
  }, []);

  // -------------------------------------------------------------------------
  // Persist ERP data to localStorage whenever it changes (after initial load)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!ready) return;
    saveErpData(data);
  }, [ready, data]);

  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------
  const login = useCallback(
    async (username: string, password: string): Promise<{ ok: boolean; error?: string }> => {
      const users = loadUsers();
      const user = users.find(
        (u) => u.username.toLowerCase() === username.trim().toLowerCase()
      );
      if (!user || user.password !== password) {
        return { ok: false, error: "Invalid username or password" };
      }
      if (!user.active) {
        return { ok: false, error: "This account is deactivated" };
      }
      // Simple base64-encoded token (no backend required)
      const token = btoa(JSON.stringify({ userId: user.id, ts: Date.now() }));
      window.localStorage.setItem(SESSION_KEY, token);
      setCurrentUser(user);
      // Reflect latest users in state
      setData((prev) => ({ ...prev, users }));
      return { ok: true };
    },
    []
  );

  const logout = useCallback(() => {
    setCurrentUser(null);
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  // -------------------------------------------------------------------------
  // Purchases
  // -------------------------------------------------------------------------
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
        items: input.items.map((i) => ({ ...i, id: uid() })) as any,
        subtotal: round(subtotal),
        gstAmount: round(gstAmount),
        total: round(subtotal + gstAmount),
        createdBy: currentUser?.username ?? "system",
        isPaid: input.isPaid ?? false,
      };

      setData((prev) => {
        const medicines = [...prev.medicines];
        for (const item of input.items) {
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
              category: item.category,
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
    [currentUser]
  );

  const updatePurchase = useCallback<ErpContextValue["updatePurchase"]>((id, patch) => {
    setData((prev) => ({
      ...prev,
      purchases: prev.purchases.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  }, []);

  // -------------------------------------------------------------------------
  // Medicines
  // -------------------------------------------------------------------------
  const addMedicine = useCallback<ErpContextValue["addMedicine"]>((input) => {
    const medicine: Medicine = { id: uid(), ...input };
    setData((prev) => ({ ...prev, medicines: [...prev.medicines, medicine] }));
    return medicine;
  }, []);

  const updateMedicine = useCallback<ErpContextValue["updateMedicine"]>((id, patch) => {
    setData((prev) => ({
      ...prev,
      medicines: prev.medicines.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  }, []);

  const deleteMedicine = useCallback((id: string) => {
    setData((prev) => ({ ...prev, medicines: prev.medicines.filter((m) => m.id !== id) }));
  }, []);

  // -------------------------------------------------------------------------
  // Billing
  // -------------------------------------------------------------------------
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
          items: input.items.map((i) => ({ ...i, id: uid() })) as any,
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
    [currentUser]
  );

  // -------------------------------------------------------------------------
  // Customers
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // Users  (stored in a separate localStorage key so auth always works)
  // -------------------------------------------------------------------------
  const addUser = useCallback<ErpContextValue["addUser"]>((username, password, role) => {
    const existing = loadUsers();
    if (existing.some((u) => u.username.toLowerCase() === username.trim().toLowerCase())) {
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
    const updated = [...existing, user];
    saveUsers(updated);
    setData((prev) => ({ ...prev, users: updated }));
    return { ok: true };
  }, []);

  const updateUser = useCallback<ErpContextValue["updateUser"]>((id, patch) => {
    setData((prev) => {
      const users = prev.users.map((u) => (u.id === id ? { ...u, ...patch } : u));
      saveUsers(users);
      return { ...prev, users };
    });
  }, []);

  const deleteUser = useCallback((id: string) => {
    setData((prev) => {
      const users = prev.users.filter((u) => u.id !== id);
      saveUsers(users);
      return { ...prev, users };
    });
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
      updatePurchase,
      addMedicine,
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
      updatePurchase,
      addMedicine,
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
