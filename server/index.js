const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const { COURTS, computeAvailability, canBook } = require("./availabilityEngine");

const app = express();
app.use(cors());
app.use(express.json());

// bookings storage
const store = {};

function getSlotBookings(date, slot) {
  return store[date]?.[slot] || [];
}

function addBooking(date, slot, booking) {
  if (!store[date]) store[date] = {};
  if (!store[date][slot]) store[date][slot] = [];
  store[date][slot].push(booking);
}

// availability check
app.get("/availability", (req, res) => {
  const { date, slot } = req.query;
  if (!date || !slot) return res.status(400).json({ error: "date and slot required" });

  const existing = getSlotBookings(date, slot);
  const bookedCourtIds = existing.map((b) => b.courtId);
  const result = computeAvailability(bookedCourtIds);

  res.json({ date, slot, ...result });
});

// daily slots
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

// new booking
app.post("/book", async (req, res) => {
  const { courtId, date, slot, name, phone, email } = req.body;

  if (!courtId || !date || !slot || !name || !phone)
    return res.status(400).json({ error: "courtId, date, slot, name, phone are required" });

  if (!COURTS[courtId])
    return res.status(400).json({ error: "Invalid courtId" });

  const existing = getSlotBookings(date, slot);
  const bookedIds = existing.map((b) => b.courtId);

  if (!canBook(courtId, bookedIds)) {
    const { reasons } = computeAvailability(bookedIds);
    return res.status(409).json({ error: "Court is not available for this slot", reasons: reasons[courtId] || [] });
  }

  const token = String(Math.floor(100000 + Math.random() * 900000));
  const booking = { id: uuidv4(), token, courtId, date, slot, name, phone, email: email || null, createdAt: new Date().toISOString() };

  addBooking(date, slot, booking);
  res.status(201).json({ booking });
});

// all bookings
app.get("/bookings", (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: "date required" });

  const dayData = store[date] || {};
  const all = Object.entries(dayData).flatMap(([slot, bookings]) => bookings.map((b) => ({ ...b, slot })));
  all.sort((a, b) => a.slot.localeCompare(b.slot));
  res.json({ date, bookings: all });
});

// cancel booking
app.delete("/book/:id", (req, res) => {
  const { id } = req.params;
  let found = false;

  for (const date of Object.keys(store)) {
    for (const slot of Object.keys(store[date])) {
      const idx = store[date][slot].findIndex((b) => b.id === id);
      if (idx !== -1) { store[date][slot].splice(idx, 1); found = true; break; }
    }
    if (found) break;
  }

  if (!found) return res.status(404).json({ error: "Booking not found" });
  res.json({ success: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on :${PORT}`));