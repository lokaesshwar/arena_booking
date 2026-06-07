const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const nodemailer = require("nodemailer");
const { COURTS, computeAvailability, canBook } = require("./availabilityEngine");

const app = express();
app.use(cors());
app.use(express.json());

// ──────────────────────────────────────────────
// In-memory store  (replace with DB in production)
// ──────────────────────────────────────────────
// Structure: { [dateKey]: { [slotKey]: Booking[] } }
// dateKey  = "YYYY-MM-DD"
// slotKey  = "HH:MM"  (start of 1-hour slot)
const store = {};

function getSlotBookings(date, slot) {
  return (store[date]?.[slot] || []);
}

function addBooking(date, slot, booking) {
  if (!store[date]) store[date] = {};
  if (!store[date][slot]) store[date][slot] = [];
  store[date][slot].push(booking);
}

// ──────────────────────────────────────────────
// Email (optional — configure via env vars)
// ──────────────────────────────────────────────
const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.ethereal.email",
  port: parseInt(process.env.SMTP_PORT || "587"),
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

async function sendConfirmationEmail(booking) {
  if (!process.env.SMTP_USER) return null;
  try {
    const info = await mailer.sendMail({
      from: `"Arena Booking" <${process.env.SMTP_USER}>`,
      to: booking.email,
      subject: `Booking Confirmed — Token #${booking.token}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:auto">
          <h2 style="color:#1a6b4a">Your booking is confirmed!</h2>
          <table style="width:100%;border-collapse:collapse;font-size:15px">
            <tr><td style="padding:8px 0;color:#555">Token</td><td><strong>#${booking.token}</strong></td></tr>
            <tr><td style="padding:8px 0;color:#555">Name</td><td>${booking.name}</td></tr>
            <tr><td style="padding:8px 0;color:#555">Court</td><td>${COURTS[booking.courtId].label}</td></tr>
            <tr><td style="padding:8px 0;color:#555">Date</td><td>${booking.date}</td></tr>
            <tr><td style="padding:8px 0;color:#555">Time</td><td>${booking.slot} – ${endSlot(booking.slot)}</td></tr>
            <tr><td style="padding:8px 0;color:#555">Phone</td><td>${booking.phone}</td></tr>
          </table>
          <p style="color:#888;font-size:13px;margin-top:24px">Please arrive 10 minutes early. Show this token at the desk.</p>
        </div>
      `,
    });
    return info.messageId;
  } catch (e) {
    console.error("Email error:", e.message);
    return null;
  }
}

function endSlot(slot) {
  const [h, m] = slot.split(":").map(Number);
  const end = new Date(0, 0, 0, h + 1, m);
  return `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
}

// ──────────────────────────────────────────────
// Routes
// ──────────────────────────────────────────────

// GET /availability?date=YYYY-MM-DD&slot=HH:MM
app.get("/availability", (req, res) => {
  const { date, slot } = req.query;
  if (!date || !slot) return res.status(400).json({ error: "date and slot required" });

  const existing = getSlotBookings(date, slot);
  const bookedCourtIds = existing.map((b) => b.courtId);
  const result = computeAvailability(bookedCourtIds);

  res.json({ date, slot, ...result });
});

// GET /slots?date=YYYY-MM-DD  — returns all slots with summary counts
app.get("/slots", (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: "date required" });

  const slots = [];
  for (let h = 6; h <= 22; h++) {
    const slot = `${String(h).padStart(2, "0")}:00`;
    const existing = getSlotBookings(date, slot);
    const bookedIds = existing.map((b) => b.courtId);
    const { available } = computeAvailability(bookedIds);
    slots.push({ slot, availableCount: available.length, totalCourts: 5, bookedCount: bookedIds.length });
  }

  res.json({ date, slots });
});

// POST /book
app.post("/book", async (req, res) => {
  const { courtId, date, slot, name, phone, email } = req.body;

  if (!courtId || !date || !slot || !name || !phone) {
    return res.status(400).json({ error: "courtId, date, slot, name, phone are required" });
  }

  if (!COURTS[courtId]) {
    return res.status(400).json({ error: "Invalid courtId" });
  }

  const existing = getSlotBookings(date, slot);
  const bookedIds = existing.map((b) => b.courtId);

  if (!canBook(courtId, bookedIds)) {
    const { reasons } = computeAvailability(bookedIds);
    return res.status(409).json({
      error: "Court is not available for this slot",
      reasons: reasons[courtId] || [],
    });
  }

  const token = String(Math.floor(100000 + Math.random() * 900000));
  const booking = {
    id: uuidv4(),
    token,
    courtId,
    date,
    slot,
    name,
    phone,
    email: email || null,
    createdAt: new Date().toISOString(),
  };

  addBooking(date, slot, booking);

  let emailSent = false;
  if (email) {
    const msgId = await sendConfirmationEmail(booking);
    emailSent = !!msgId;
  }

  res.status(201).json({ booking, emailSent });
});

// GET /bookings?date=YYYY-MM-DD  — admin view
app.get("/bookings", (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: "date required" });

  const dayData = store[date] || {};
  const all = Object.entries(dayData).flatMap(([slot, bookings]) =>
    bookings.map((b) => ({ ...b, slot }))
  );
  all.sort((a, b) => a.slot.localeCompare(b.slot));
  res.json({ date, bookings: all });
});

// DELETE /book/:id  — cancel
app.delete("/book/:id", (req, res) => {
  const { id } = req.params;
  let found = false;

  for (const date of Object.keys(store)) {
    for (const slot of Object.keys(store[date])) {
      const idx = store[date][slot].findIndex((b) => b.id === id);
      if (idx !== -1) {
        store[date][slot].splice(idx, 1);
        found = true;
        break;
      }
    }
    if (found) break;
  }

  if (!found) return res.status(404).json({ error: "Booking not found" });
  res.json({ success: true });
});

// ──────────────────────────────────────────────
// Unit-test endpoint (dev only)
// ──────────────────────────────────────────────
app.get("/test", (req, res) => {
  const { computeAvailability } = require("./availabilityEngine");
  const cases = [
    { label: "Empty", booked: [], expectedAvail: 5 },
    { label: "T1-5v5 booked", booked: ["T1-5v5"], expectedAvail: 3 },
    { label: "T1-7v7 booked", booked: ["T1-7v7"], expectedAvail: 3 },
    { label: "T1-5v5 + T3-5v5 booked", booked: ["T1-5v5", "T3-5v5"], expectedAvail: 1 },
    { label: "T1-7v7 + T2-7v7 booked", booked: ["T1-7v7", "T2-7v7"], expectedAvail: 0 },
  ];

  const results = cases.map((c) => {
    const { available, blocked } = computeAvailability(c.booked);
    return {
      ...c,
      available,
      blocked,
      pass: available.length === c.expectedAvail,
    };
  });

  const allPassed = results.every((r) => r.pass);
  res.json({ allPassed, results });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Arena booking server running on :${PORT}`));
