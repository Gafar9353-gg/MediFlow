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

  // Helper to fetch with token
  const apiFetch = async (url: string, options: RequestInit = {}) => {
    const token = window.localStorage.getItem(SESSION_KEY);
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  };

  useEffect(() => {
    async function init() {
      const token = window.localStorage.getItem(SESSION_KEY);
      if (token) {
        try {
          const vRes = await apiFetch("/api/auth/verify");
          if (vRes.ok) {
            const vData = await vRes.json();
            setCurrentUser(vData.user);
            const sRes = await apiFetch("/api/sync");
            if (sRes.ok) {
              const sData = await sRes.json();
              setData(sData);
            }
          } else {
            window.localStorage.removeItem(SESSION_KEY);
          }
        } catch (e) {
          console.error("Failed to sync from backend", e);
        }
      }
      setReady(true);
    }
    init();
  }, []);

  const login = useCallback(
    async (username: string, password: string): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await apiFetch("/api/login", {
          method: "POST",
          body: JSON.stringify({ username, password }),
        });
        const json = await res.json();
        if (!res.ok) return { ok: false, error: json.error || "Login failed" };
        
        window.localStorage.setItem(SESSION_KEY, json.token);
        setCurrentUser(json.user);
        
        // Sync data after login
        const sRes = await apiFetch("/api/sync");
        if (sRes.ok) {
          setData(await sRes.json());
        }
        return { ok: true };
      } catch (e) {
        return { ok: false, error: "Network error" };
      }
    },
    []
  );

  const logout = useCallback(() => {
    setCurrentUser(null);
    setData(seedData());
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
        items: input.items.map(i => ({...i, id: uid()})) as any,
        subtotal: round(subtotal),
        gstAmount: round(gstAmount),
        total: round(subtotal + gstAmount),
        createdBy: currentUser?.username ?? "system",
        isPaid: input.isPaid ?? false,
      };
      
      // Update locally
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

      // Update remotely
      apiFetch("/api/purchases", {
        method: "POST",
        body: JSON.stringify(purchase)
      }).catch(console.error);

      return purchase;
    },
    [currentUser]
  );

  const updatePurchase = useCallback<ErpContextValue["updatePurchase"]>((id, patch) => {
    setData((prev) => ({
      ...prev,
      purchases: prev.purchases.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
    apiFetch(`/api/purchases/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch)
    }).catch(console.error);
  }, []);

  const addMedicine = useCallback<ErpContextValue["addMedicine"]>((input) => {
    const medicine: Medicine = {
      id: uid(),
      ...input,
    };
    setData((prev) => ({
      ...prev,
      medicines: [...prev.medicines, medicine],
    }));
    apiFetch("/api/medicines", {
      method: "POST",
      body: JSON.stringify(medicine)
    }).catch(console.error);
    return medicine;
  }, []);

  const updateMedicine = useCallback<ErpContextValue["updateMedicine"]>((id, patch) => {
    setData((prev) => ({
      ...prev,
      medicines: prev.medicines.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
    apiFetch(`/api/medicines/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch)
    }).catch(console.error);
  }, []);

  const deleteMedicine = useCallback((id: string) => {
    setData((prev) => ({ ...prev, medicines: prev.medicines.filter((m) => m.id !== id) }));
    apiFetch(`/api/medicines/${id}`, { method: "DELETE" }).catch(console.error);
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
          items: input.items.map(i => ({...i, id: uid()})) as any,
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
      
      apiFetch("/api/bills", {
        method: "POST",
        body: JSON.stringify(bill)
      }).catch(console.error);
      
      return bill;
    },
    [currentUser]
  );

  const addCustomer = useCallback<ErpContextValue["addCustomer"]>((name, phone) => {
    const customer: Customer = { id: uid(), name, phone, createdAt: today() };
    setData((prev) => ({ ...prev, customers: [customer, ...prev.customers] }));
    apiFetch("/api/customers", {
      method: "POST",
      body: JSON.stringify(customer)
    }).catch(console.error);
    return customer;
  }, []);

  const updateCustomer = useCallback<ErpContextValue["updateCustomer"]>((id, patch) => {
    setData((prev) => ({
      ...prev,
      customers: prev.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
    apiFetch(`/api/customers/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch)
    }).catch(console.error);
  }, []);

  const deleteCustomer = useCallback((id: string) => {
    setData((prev) => ({ ...prev, customers: prev.customers.filter((c) => c.id !== id) }));
    apiFetch(`/api/customers/${id}`, { method: "DELETE" }).catch(console.error);
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
    [data.users]
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
