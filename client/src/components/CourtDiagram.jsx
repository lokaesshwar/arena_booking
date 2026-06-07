import React from "react";

const STATUS_LABEL = {
  available: "Available",
  booked: "Booked",
  blocked: "Blocked",
};

// same conflict map as the server — which courts does each court block
const CONFLICTS = {
  "T1-7v7": ["T1-5v5", "T2-5v5"],
  "T2-7v7": ["T2-5v5", "T3-5v5"],
  "T1-5v5": ["T1-7v7"],
  "T2-5v5": ["T1-7v7", "T2-7v7"],
  "T3-5v5": ["T2-7v7"],
};

export default function CourtDiagram({ availability, onCourtClick, selectedCourt, compact }) {
  if (!availability) return null;

  const { booked = [], blocked = [], available = [] } = availability;

  // courts blocked by the currently selected court
  const pendingBlocked = selectedCourt ? (CONFLICTS[selectedCourt] || []) : [];

  const getStatus = (id) => {
    if (booked.includes(id)) return "booked";
    if (blocked.includes(id)) return "blocked";
    // if this court is blocked by the selected court, show it as blocked immediately
    if (selectedCourt && id !== selectedCourt && pendingBlocked.includes(id)) return "blocked";
    if (available.includes(id)) return "available";
    return "unavailable";
  };

  const CourtCell = ({ id, children, wide }) => {
    const status = getStatus(id);
    const isSelected = selectedCourt === id;
    const isClickable = status === "available" && !isSelected;

    return (
      <div
        className={`court-cell ${status} ${wide ? "wide" : ""} ${isSelected ? "selected" : ""} ${isClickable ? "clickable" : ""}`}
        onClick={() => isClickable && onCourtClick && onCourtClick(id)}
        title={availability.reasons?.[id]?.join(" • ") || STATUS_LABEL[status]}
      >
        <span className="court-id">{id}</span>
        <span className="court-status-pill">{isSelected ? "Selected" : STATUS_LABEL[status]}</span>
        {children}
      </div>
    );
  };

  return (
    <div className="court-diagram-wrap">
      {!compact && <p className="diagram-label">Physical court layout</p>}
      <div className="diagram-grid">
        <div className="row row-7v7">
          <CourtCell id="T1-7v7" wide>14 players</CourtCell>
          <CourtCell id="T2-7v7" wide>14 players</CourtCell>
        </div>
        <div className="row row-5v5">
          <CourtCell id="T1-5v5">10 players</CourtCell>
          <CourtCell id="T2-5v5">10 players</CourtCell>
          <CourtCell id="T3-5v5">10 players</CourtCell>
        </div>
      </div>
      {!compact && (
        <div className="legend">
          <span className="legend-item available"><span className="dot" />Available</span>
          <span className="legend-item booked"><span className="dot" />Booked</span>
          <span className="legend-item blocked"><span className="dot" />Blocked (overlap)</span>
        </div>
      )}
    </div>
  );
}