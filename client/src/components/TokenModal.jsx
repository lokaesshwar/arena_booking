import React, { useEffect } from "react";

export default function TokenModal({ booking, court, onClose }) {
  useEffect(() => {
    const handleKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!booking) return null;

  const formatTime = (slot) => {
    const [h, m] = slot.split(":").map(Number);
    const end = new Date(0, 0, 0, h + 1, m);
    const fmt = (d) =>
      d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    const start = new Date(0, 0, 0, h, m);
    return `${fmt(start)} – ${fmt(end)}`;
  };

  const formatDate = (d) => {
    const [y, mo, day] = d.split("-");
    const date = new Date(y, mo - 1, day);
    return date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-header">
          <div className="check-icon">✓</div>
          <h2>Booking Confirmed!</h2>
          <p className="modal-sub">Your court has been reserved</p>
        </div>

        <div className="token-display">
          <span className="token-label">Booking Token</span>
          <span className="token-number">#{booking.token}</span>
          <span className="token-hint">Show this at the entrance</span>
        </div>

        <div className="booking-details">
          <div className="detail-row">
            <span className="detail-icon">🏟</span>
            <div>
              <span className="detail-label">Court</span>
              <span className="detail-value">{court?.label || booking.courtId}</span>
            </div>
          </div>
          <div className="detail-row">
            <span className="detail-icon">📅</span>
            <div>
              <span className="detail-label">Date</span>
              <span className="detail-value">{formatDate(booking.date)}</span>
            </div>
          </div>
          <div className="detail-row">
            <span className="detail-icon">⏰</span>
            <div>
              <span className="detail-label">Time</span>
              <span className="detail-value">{formatTime(booking.slot)}</span>
            </div>
          </div>
          <div className="detail-row">
            <span className="detail-icon">👤</span>
            <div>
              <span className="detail-label">Name</span>
              <span className="detail-value">{booking.name}</span>
            </div>
          </div>
          {booking.emailSent && (
            <div className="email-note">
              <span>📧</span> Confirmation sent to {booking.email}
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
