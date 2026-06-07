import React from "react";

const COURTS = {
  "T1-7v7": { label: "T1 — 7v7", cap: "14 players" },
  "T2-7v7": { label: "T2 — 7v7", cap: "14 players" },
  "T1-5v5": { label: "T1 — 5v5", cap: "10 players" },
  "T2-5v5": { label: "T2 — 5v5", cap: "10 players" },
  "T3-5v5": { label: "T3 — 5v5", cap: "10 players" },
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function fmtDate(dateStr) {
  const [y, mo, day] = dateStr.split("-").map(Number);
  const d = new Date(y, mo - 1, day);
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[mo - 1]}`;
}

function fmtSlot(slot) {
  const h = parseInt(slot);
  const fmt = (hour) => {
    const d = new Date(0, 0, 0, hour);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  };
  return `${fmt(h)} – ${fmt(h + 1)}`;
}

function isUpcoming(dateStr, slot) {
  const [y, mo, day] = dateStr.split("-").map(Number);
  const h = parseInt(slot);
  const end = new Date(y, mo - 1, day, h + 1);
  return end > new Date();
}

export default function MyBookings({ bookings, onBook }) {
  if (bookings.length === 0) {
    return (
      <div className="mb-empty">
        <div className="mb-empty-icon">📋</div>
        <h3>No bookings yet</h3>
        <p>Your confirmed bookings will appear here with tokens and timing details.</p>
        <button className="mb-book-btn" onClick={onBook}>Book a court →</button>
      </div>
    );
  }

  const sorted = [...bookings].reverse();
  const upcoming = sorted.filter((b) => isUpcoming(b.date, b.slot));
  const past = sorted.filter((b) => !isUpcoming(b.date, b.slot));

  const renderBooking = (b) => {
    const court = COURTS[b.courtId];
    const up = isUpcoming(b.date, b.slot);
    return (
      <div key={b.id} className={`mb-card ${up ? "upcoming" : "past"}`}>
        <div className="mb-card-top">
          <div className="mb-token-block">
            <span className="mb-token-label">Token</span>
            <span className="mb-token"># {b.token}</span>
          </div>
          <span className={`mb-status ${up ? "green" : "grey"}`}>
            {up ? "Upcoming" : "Completed"}
          </span>
        </div>
        <div className="mb-court-name">{court?.label || b.courtId}</div>
        <div className="mb-details-grid">
          <div className="mb-detail">
            <span className="mb-detail-label">📅 Date</span>
            <span className="mb-detail-val">{fmtDate(b.date)}</span>
          </div>
          <div className="mb-detail">
            <span className="mb-detail-label">⏰ Time</span>
            <span className="mb-detail-val">{fmtSlot(b.slot)}</span>
          </div>
          <div className="mb-detail">
            <span className="mb-detail-label">👤 Name</span>
            <span className="mb-detail-val">{b.name}</span>
          </div>
          <div className="mb-detail">
            <span className="mb-detail-label">📱 Phone</span>
            <span className="mb-detail-val">{b.phone}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mb-wrap">
      <div className="mb-header">
        <h2 className="mb-title">My Bookings</h2>
        <button className="mb-book-btn small" onClick={onBook}>+ New booking</button>
      </div>
      {upcoming.length > 0 && (
        <section className="mb-section">
          <div className="mb-section-label">Upcoming ({upcoming.length})</div>
          {upcoming.map(renderBooking)}
        </section>
      )}
      {past.length > 0 && (
        <section className="mb-section">
          <div className="mb-section-label">Past ({past.length})</div>
          {past.map(renderBooking)}
        </section>
      )}
    </div>
  );
}
