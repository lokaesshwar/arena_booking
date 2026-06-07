const BASE = process.env.REACT_APP_API_URL || "";

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error || "Request failed"), { data });
  return data;
}

export const api = {
  getSlots: (date) => req(`/slots?date=${date}`),
  getAvailability: (date, slot) => req(`/availability?date=${date}&slot=${encodeURIComponent(slot)}`),
  book: (payload) => req("/book", { method: "POST", body: JSON.stringify(payload) }),
  getBookings: (date) => req(`/bookings?date=${date}`),
  cancel: (id) => req(`/book/${id}`, { method: "DELETE" }),
};
