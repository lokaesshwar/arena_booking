# ArenaBook — Turf Court Booking System

A full-stack turf booking application with a real-time availability engine that correctly handles parent-child court overlaps.

## Architecture

```
turf-booking/
├── server/                 # Node.js + Express API
│   ├── index.js            # Express app, routes, email
│   └── availabilityEngine.js  # Core overlap logic
└── client/                 # React frontend
    └── src/
        ├── pages/BookingPage.jsx     # Main page
        ├── components/
        │   ├── CourtDiagram.jsx      # Visual court layout
        │   ├── BookingForm.jsx       # User details form
        │   └── TokenModal.jsx        # Confirmation popup
        └── utils/api.js              # HTTP client
```

## Setup

### 1. Backend

```bash
cd server
npm install
node index.js         # Runs on port 3001
```


### 2. Frontend

```bash
cd client
npm install
npm start             # Runs on port 3000, proxies API to 3001
```

Open **http://localhost:3000**

---

## Availability Engine Logic

Physical layout:
```
[    T1-7v7    |    T2-7v7    ]
[ T1-5v5 | T2-5v5 | T3-5v5  ]
```

Rules:
- T1-7v7 physically covers T1-5v5 and T2-5v5
- T2-7v7 physically covers T2-5v5 and T3-5v5
- T2-5v5 is shared between BOTH 7v7 courts

Booking a 7v7 → blocks both its constituent 5v5 courts.  
Booking a 5v5 → blocks any 7v7 court it falls under.

**Test the engine:**
```
GET http://localhost:3001/test
```
Returns pass/fail for all four canonical test cases.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/slots?date=YYYY-MM-DD` | Daily slot summary |
| GET | `/availability?date=&slot=` | Court availability for a slot |
| POST | `/book` | Create a booking |
| GET | `/bookings?date=YYYY-MM-DD` | All bookings for a day |
| DELETE | `/book/:id` | Cancel a booking |
| GET | `/test` | Run availability test cases |

**POST /book payload:**
```json
{
  "courtId": "T1-7v7",
  "date": "2026-06-10",
  "slot": "18:00",
  "name": "Rahul Sharma",
  "phone": "9876543210",
  "email": "rahul@example.com"
}
```

**Response includes a 6-digit token:**
```json
{
  "booking": { "token": "482910", "id": "uuid", ... },
  "emailSent": true
}
```
