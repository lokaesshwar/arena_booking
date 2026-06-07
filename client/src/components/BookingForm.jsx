import React, { useState } from "react";

export default function BookingForm({ court, slot, date, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [errors, setErrors] = useState({});

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.phone.trim()) errs.phone = "Phone is required";
    else if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\s/g, "")))
      errs.phone = "Enter a valid 10-digit mobile number";
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email))
      errs.email = "Enter a valid email";
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit(form);
  };

  const formatTime = (s) => {
    const [h, m] = s.split(":").map(Number);
    const start = new Date(0, 0, 0, h, m);
    const end = new Date(0, 0, 0, h + 1, m);
    const fmt = (d) =>
      d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    return `${fmt(start)} – ${fmt(end)}`;
  };

  const formatDate = (d) => {
    const [y, mo, day] = d.split("-");
    return new Date(y, mo - 1, day).toLocaleDateString("en-IN", {
      weekday: "short", day: "numeric", month: "short",
    });
  };

  return (
    <div className="booking-form-wrap">
      <div className="form-summary-bar">
        <div className="summary-chip court-chip">{court?.label || "—"}</div>
        <div className="summary-chip">{formatDate(date)}</div>
        <div className="summary-chip">{formatTime(slot)}</div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="field-group">
          <label>Your name</label>
          <input
            type="text"
            placeholder="Full name"
            value={form.name}
            onChange={set("name")}
            className={errors.name ? "error" : ""}
            autoFocus
          />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>

        <div className="field-group">
          <label>Mobile number</label>
          <input
            type="tel"
            placeholder="10-digit mobile"
            value={form.phone}
            onChange={set("phone")}
            className={errors.phone ? "error" : ""}
            maxLength={10}
          />
          {errors.phone && <span className="field-error">{errors.phone}</span>}
        </div>

        <div className="field-group">
          <label>
            Email <span className="optional">(optional — for confirmation)</span>
          </label>
          <input
            type="email"
            placeholder="your@email.com"
            value={form.email}
            onChange={set("email")}
            className={errors.email ? "error" : ""}
          />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </div>

        <div className="form-actions">
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Back
          </button>
          <button type="submit" className="btn-book" disabled={loading}>
            {loading ? "Confirming…" : "Confirm Booking →"}
          </button>
        </div>
      </form>
    </div>
  );
}
