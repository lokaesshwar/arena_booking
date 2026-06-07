import React, { useState, useEffect, useCallback } from "react";
import CourtDiagram from "../components/CourtDiagram";
import BookingForm from "../components/BookingForm";
import TokenModal from "../components/TokenModal";
import MyBookings from "../components/MyBookings";
import { api } from "../utils/api";

const TIME_SLOTS = Array.from({ length: 17 }, (_, i) => {
  const h = 6 + i;
  return `${String(h).padStart(2, "0")}:00`;
});

function getDates() {
  const dates = [];
  const now = new Date();
  for (let i = 0; i < 8; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    dates.push(d);
  }
  return dates;
}
const DATES = getDates();
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function todayStr() { return new Date().toISOString().slice(0, 10); }
function dateKey(d) { return d.toISOString().slice(0, 10); }
function fmt12(h) {
  const d = new Date(0, 0, 0, h);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function fmtSlot(slot) {
  const h = parseInt(slot);
  return `${fmt12(h)} – ${fmt12(h + 1)}`;
}
function fmtDate(d) {
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

export default function BookingPage() {
  const [activeTab, setActiveTab] = useState("book");
  const [dateIdx, setDateIdx] = useState(0);
  const [slot, setSlot] = useState(null);
  const [court, setCourt] = useState(null);
  const [step, setStep] = useState("date");
  const [availability, setAvailability] = useState(null);
  const [slotSummary, setSlotSummary] = useState([]);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState(null);

  // load from localStorage on mount
  const [myBookings, setMyBookings] = useState(() => {
    try { return JSON.parse(localStorage.getItem("myBookings")) || []; }
    catch { return []; }
  });

  const selectedDate = DATES[dateIdx];

  // daily slot summary when date changes
  useEffect(() => {
    setLoadingSlots(true);
    api.getSlots(dateKey(selectedDate))
      .then((d) => setSlotSummary(d.slots))
      .catch(() => setSlotSummary([]))
      .finally(() => setLoadingSlots(false));
    setSlot(null); setCourt(null); setAvailability(null); setStep("date");
  }, [dateIdx]);

  // court availability when slot changes
  const loadAvailability = useCallback((s) => {
    setAvailability(null);
    api.getAvailability(dateKey(selectedDate), s)
      .then(setAvailability)
      .catch(() => setAvailability(null));
  }, [selectedDate]);

  const handleDateClick = (idx) => setDateIdx(idx);

  const handleSlotClick = (s) => {
    setSlot(s); setCourt(null); setStep("slot");
    loadAvailability(s);
  };

  const handleCourtClick = (id) => {
    setCourt(id); setStep("form"); setError(null);
  };

  const handleBack = () => {
    setCourt(null); setStep("slot");
  };

  const handleBookingSubmit = async (formData) => {
    setLoading(true); setError(null);
    try {
      const res = await api.book({ courtId: court, date: dateKey(selectedDate), slot, ...formData });
      const booking = { ...res.booking, emailSent: res.emailSent };
      setConfirmedBooking(booking);

      // save to localStorage so it survives reload
      setMyBookings((prev) => {
        const updated = [...prev, booking];
        localStorage.setItem("myBookings", JSON.stringify(updated));
        return updated;
      });

      setStep("confirm");
      loadAvailability(slot);

      // refresh slot summary instantly without reload
      api.getSlots(dateKey(selectedDate)).then((d) => setSlotSummary(d.slots)).catch(() => {});
    } catch (e) {
      setError(e.data?.error || "Booking failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleNewBooking = () => {
    setStep("date"); setSlot(null); setCourt(null); setConfirmedBooking(null);
  };

  const slotMap = Object.fromEntries(slotSummary.map((s) => [s.slot, s]));
  const now = new Date();

  const isSlotPast = (s) => {
    if (dateIdx > 0) return false;
    return parseInt(s) <= now.getHours();
  };

  return (
    <div className="app-wrap">
      {/* Top bar */}
      <header className="topbar">
        <div className="topbar-brand">
          <span className="brand-dot" />
          ArenaBook
        </div>
        <nav className="tab-row">
          <button className={`tab-btn${activeTab === "book" ? " active" : ""}`} onClick={() => setActiveTab("book")}>
            Book a court
          </button>
          <button className={`tab-btn${activeTab === "mine" ? " active" : ""}`} onClick={() => setActiveTab("mine")}>
            My bookings {myBookings.length > 0 && <span className="tab-badge">{myBookings.length}</span>}
          </button>
        </nav>
      </header>

      <main className="page-content">
        {activeTab === "mine" ? (
          <MyBookings bookings={myBookings} onBook={() => setActiveTab("book")} />
        ) : step === "confirm" && confirmedBooking ? (
          <ConfirmScreen booking={confirmedBooking} dateObj={selectedDate} slot={slot} onNew={handleNewBooking} />
        ) : (
          <>
            {/* Date strip */}
            <section className="section">
              <div className="section-label">Choose a date</div>
              <div className="date-strip">
                {DATES.map((d, i) => (
                  <button key={i} className={`date-chip${dateIdx === i ? " active" : ""}`} onClick={() => handleDateClick(i)}>
                    <span className="dc-day">{DAY_NAMES[d.getDay()]}</span>
                    <span className="dc-num">{d.getDate()}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Slot grid */}
            <section className="section">
              <div className="section-label">Pick a time slot</div>
              <div className="slot-grid">
                {TIME_SLOTS.map((s) => {
                  const past = isSlotPast(s);
                  const info = slotMap[s];
                  const full = info && info.availableCount === 0;
                  const avail = info?.availableCount ?? 5;
                  const active = slot === s;
                  const pct = Math.round((avail / 5) * 100);
                  return (
                    <button
                      key={s}
                      className={`slot-chip${active ? " active" : ""}${past ? " past" : ""}${full ? " full" : ""}`}
                      disabled={past || full}
                      onClick={() => handleSlotClick(s)}
                    >
                      <span className="sc-time">{fmt12(parseInt(s))}</span>
                      <div className="sc-bar-wrap">
                        <div className="sc-bar" style={{ width: `${active ? 100 : pct}%` }} />
                      </div>
                      <span className="sc-avail">
                        {past ? "past" : full ? "full" : loadingSlots ? "" : `${avail} open`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Court selector */}
            {slot && (
              <section className="section">
                {step === "form" ? (
                  <div className="card">
                    <div className="form-header">
                      <button className="form-back" onClick={handleBack} aria-label="Back">←</button>
                      <span className="form-court-tag">{availability?.courts?.[court]?.label || court}</span>
                      <span className="form-time-tag">{fmtSlot(slot)}</span>
                    </div>
                    {error && <div className="error-banner">{error}</div>}
                    <BookingForm
                      court={availability?.courts?.[court]}
                      slot={slot}
                      date={dateKey(selectedDate)}
                      onSubmit={handleBookingSubmit}
                      loading={loading}
                      hideBack
                    />
                  </div>
                ) : (
                  <div className="card">
                    <div className="section-label">
                      Select a court — <span style={{ color: "var(--grass)" }}>{fmtSlot(slot)}</span>
                    </div>
                    {!availability ? (
                      <div className="avail-loading">
                        <div className="loading-bar"><div className="loading-bar-inner" /></div>
                        Loading courts…
                      </div>
                    ) : (
                      <>
                        <CourtDiagram
                          availability={availability}
                          selectedCourt={court}
                          onCourtClick={handleCourtClick}
                        />
                        {!court && <p className="select-hint">↑ Tap a green court to book it</p>}
                      </>
                    )}
                  </div>
                )}

                {step === "form" && (
                  <div className="summary-card">
                    <div className="section-label">Summary</div>
                    <CourtDiagram
                      availability={availability}
                      selectedCourt={court}
                      onCourtClick={handleCourtClick}
                      compact
                    />
                  </div>
                )}
              </section>
            )}

            {!slot && (
              <div className="empty-hint">
                <span>🏟</span>
                <p>Select a time slot to see available courts</p>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="site-footer">ArenaBook · Real-time turf management</footer>
    </div>
  );
}

function ConfirmScreen({ booking, dateObj, slot, onNew }) {
  return (
    <div className="confirm-wrap">
      <div className="confirm-check">✓</div>
      <h2 style={{ fontSize: 18, marginBottom: 4 }}>Booking confirmed!</h2>
      <p style={{ color: "var(--ink-mute)", fontSize: 14 }}>Show your token at the entrance</p>
      <div className="token-block">
        <span className="token-label-sm">Token</span>
        <span className="token-big">#{booking.token}</span>
      </div>
      <div className="confirm-details">
        <div className="cd-row"><span>Court</span><span className="cd-val">{booking.courtId}</span></div>
        <div className="cd-row"><span>Date</span><span className="cd-val">{fmtDate(dateObj)}</span></div>
        <div className="cd-row"><span>Time</span><span className="cd-val">{fmtSlot(slot)}</span></div>
        <div className="cd-row"><span>Name</span><span className="cd-val">{booking.name}</span></div>
      </div>
      <button className="btn-new" onClick={onNew}>+ Book another court</button>
    </div>
  );
}