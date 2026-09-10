require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const authMiddleware = require("./middleware/auth");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

// ----------------------------------------------------
// AUTHENTICATION
// ----------------------------------------------------
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() }
  });

  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Invalid username or password" });
  }
  if (!user.active) {
    return res.status(401).json({ error: "This account is deactivated" });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

app.get("/api/auth/verify", authMiddleware, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// ----------------------------------------------------
// BULK DATA SYNC (For Frontend Store)
// ----------------------------------------------------
app.get("/api/sync", authMiddleware, async (req, res) => {
  try {
    const [users, medicines, purchases, bills, customers] = await Promise.all([
      prisma.user.findMany({ select: { id: true, username: true, role: true, active: true, createdAt: true } }),
      prisma.medicine.findMany(),
      prisma.purchase.findMany({ include: { items: true }, orderBy: { date: 'desc' } }),
      prisma.bill.findMany({ include: { items: true }, orderBy: { date: 'desc' } }),
      prisma.customer.findMany({ orderBy: { createdAt: 'desc' } }),
    ]);

    // Format dates to match frontend expectations if necessary
    res.json({
      users,
      medicines,
      purchases,
      bills,
      customers
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to sync data" });
  }
});

// ----------------------------------------------------
// CRUD ENDPOINTS
// ----------------------------------------------------

// Medicines
app.post("/api/medicines", authMiddleware, async (req, res) => {
  try {
    const medicine = await prisma.medicine.create({ data: req.body });
    res.json(medicine);
  } catch (error) {
    res.status(500).json({ error: "Failed to create medicine" });
  }
});

app.put("/api/medicines/:id", authMiddleware, async (req, res) => {
  try {
    const medicine = await prisma.medicine.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(medicine);
  } catch (error) {
    res.status(500).json({ error: "Failed to update medicine" });
  }
});

app.delete("/api/medicines/:id", authMiddleware, async (req, res) => {
  try {
    await prisma.medicine.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete medicine" });
  }
});

// Purchases
app.post("/api/purchases", authMiddleware, async (req, res) => {
  const { items, ...purchaseData } = req.body;
  try {
    const purchase = await prisma.purchase.create({
      data: {
        ...purchaseData,
        items: {
          create: items
        }
      },
      include: { items: true }
    });

    // Update medicine stock
    for (const item of items) {
      const existing = await prisma.medicine.findUnique({ where: { id: item.medicineId } });
      if (existing) {
        await prisma.medicine.update({
          where: { id: item.medicineId },
          data: {
            stock: existing.stock + item.quantity,
            batchNo: item.batchNo || existing.batchNo,
            expiryDate: item.expiryDate || existing.expiryDate,
            purchasePrice: item.purchasePrice,
            sellingPrice: item.sellingPrice,
            gst: item.gst,
            rack: item.rack || existing.rack,
          }
        });
      } else {
        await prisma.medicine.create({
          data: {
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
          }
        });
      }
    }

    res.json(purchase);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create purchase" });
  }
});

app.put("/api/purchases/:id", authMiddleware, async (req, res) => {
  try {
    const purchase = await prisma.purchase.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(purchase);
  } catch (error) {
    res.status(500).json({ error: "Failed to update purchase" });
  }
});

// Bills
app.post("/api/bills", authMiddleware, async (req, res) => {
  const { items, ...billData } = req.body;
  try {
    const bill = await prisma.bill.create({
      data: {
        ...billData,
        items: {
          create: items
        }
      },
      include: { items: true }
    });

    // Deduct stock
    for (const item of items) {
      const existing = await prisma.medicine.findUnique({ where: { id: item.medicineId } });
      if (existing) {
        await prisma.medicine.update({
          where: { id: item.medicineId },
          data: {
            stock: Math.max(0, existing.stock - item.quantity)
          }
        });
      }
    }

    res.json(bill);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create bill" });
  }
});

// Customers
app.post("/api/customers", authMiddleware, async (req, res) => {
  try {
    const customer = await prisma.customer.create({ data: req.body });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: "Failed to create customer" });
  }
});

app.put("/api/customers/:id", authMiddleware, async (req, res) => {
  try {
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: "Failed to update customer" });
  }
});

app.delete("/api/customers/:id", authMiddleware, async (req, res) => {
  try {
    await prisma.customer.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete customer" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});
