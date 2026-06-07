/**
 * Arena Availability Engine
 *
 * Physical layout:
 *   [  T1-7v7  |  T2-7v7  ]
 *   [ T1-5v5 | T2-5v5 | T3-5v5 ]
 *
 * Overlap map:
 *   T1-7v7 occupies the same physical space as T1-5v5 + T2-5v5
 *   T2-7v7 occupies the same physical space as T2-5v5 + T3-5v5
 *
 * Consequence: T2-5v5 is shared between BOTH 7v7 courts.
 */

const COURTS = {
  "T1-7v7": { id: "T1-7v7", type: "7v7", label: "Court T1 — 7v7", capacity: 14 },
  "T2-7v7": { id: "T2-7v7", type: "7v7", label: "Court T2 — 7v7", capacity: 14 },
  "T1-5v5": { id: "T1-5v5", type: "5v5", label: "Court T1 — 5v5", capacity: 10 },
  "T2-5v5": { id: "T2-5v5", type: "5v5", label: "Court T2 — 5v5", capacity: 10 },
  "T3-5v5": { id: "T3-5v5", type: "5v5", label: "Court T3 — 5v5", capacity: 10 },
};

// Which 5v5 courts does each 7v7 court physically cover?
const SEVEN_COVERS = {
  "T1-7v7": ["T1-5v5", "T2-5v5"],
  "T2-7v7": ["T2-5v5", "T3-5v5"],
};

// Which 7v7 courts does each 5v5 court fall under?
const FIVE_UNDER = {
  "T1-5v5": ["T1-7v7"],
  "T2-5v5": ["T1-7v7", "T2-7v7"],
  "T3-5v5": ["T2-7v7"],
};

/**
 * Compute availability for a given time slot.
 *
 * @param {string[]} bookedCourtIds - Courts already confirmed for this slot
 * @returns {{ available: string[], blocked: string[], reasons: Record<string, string[]> }}
 */
function computeAvailability(bookedCourtIds = []) {
  const booked = new Set(bookedCourtIds);
  const blocked = new Set();
  const reasons = {};

  const addReason = (courtId, reason) => {
    reasons[courtId] = reasons[courtId] || [];
    reasons[courtId].push(reason);
  };

  // Pass 1: anything directly booked is both booked AND blocks its overlapping courts
  for (const id of booked) {
    blocked.add(id);
    addReason(id, "Directly booked");

    if (id === "T1-7v7" || id === "T2-7v7") {
      // A 7v7 blocks its constituent 5v5 courts
      for (const fiveId of SEVEN_COVERS[id]) {
        blocked.add(fiveId);
        addReason(fiveId, `${id} is booked (overlapping physical space)`);
      }
    } else {
      // A 5v5 blocks its parent 7v7 courts only if enough 5v5 slots are taken
      // under that 7v7 to fully occupy it
      for (const sevenId of FIVE_UNDER[id]) {
        const coveredFives = SEVEN_COVERS[sevenId];
        const bookedUnder = coveredFives.filter((f) => booked.has(f));
        if (bookedUnder.length >= 2) {
          // Both 5v5s under this 7v7 are booked → 7v7 physically impossible
          blocked.add(sevenId);
          addReason(sevenId, `Both constituent 5v5 courts (${coveredFives.join(", ")}) are booked`);
        } else if (bookedUnder.length === 1) {
          // Only one 5v5 booked under this 7v7 — 7v7 still blocked because the
          // physical half is occupied
          blocked.add(sevenId);
          addReason(sevenId, `${bookedUnder[0]} overlaps with this court's physical space`);
        }
      }
    }
  }

  const available = Object.keys(COURTS).filter((id) => !blocked.has(id));

  return {
    courts: COURTS,
    booked: [...booked],
    available,
    blocked: [...blocked].filter((id) => !booked.has(id)), // blocked but not directly booked
    reasons,
  };
}

/**
 * Check if a specific court can be booked given current state.
 */
function canBook(courtId, bookedCourtIds = []) {
  const { available } = computeAvailability(bookedCourtIds);
  return available.includes(courtId);
}

module.exports = { COURTS, computeAvailability, canBook };
