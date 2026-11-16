const inrFormatter = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const inrWhole = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

export const inr = (v: number | null | undefined) => (v === null || v === undefined ? "—" : inrFormatter.format(v));
export const inrShort = (v: number | null | undefined) => (v === null || v === undefined ? "—" : inrWhole.format(v));
export const points = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${num.format(v)} pts`);
export const number = (v: number | null | undefined) => (v === null || v === undefined ? "—" : num.format(v));
export const grams = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${num.format(v)} g`);

export function date(v: string | Date | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function dateTime(v: string | Date | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export const mobile = (v: string | null | undefined) => (v ? `+91 ${v.slice(0, 5)} ${v.slice(5)}` : "—");

export const titleCase = (v: string) => v.toLowerCase().replace(/(^|_)(\w)/g, (_, sep, c) => (sep ? " " : "") + c.toUpperCase());

/** Converts an ISO timestamp into the value format of <input type="datetime-local">. */
export function toLocalInput(v: string | null | undefined) {
  if (!v) return "";
  const d = new Date(v);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** How a customer came to the store. Partner-referred customers are stored as INFLUENCER. */
export const sourceLabel = (source: string) => (source === "INFLUENCER" ? "Partner" : titleCase(source));

export const PARTNER_TYPES = [
  { value: "INFLUENCER", label: "Influencer" },
  { value: "BUSINESS", label: "Business" },
  { value: "OTHER", label: "Other" },
] as const;
export const partnerTypeLabel = (type: string) => PARTNER_TYPES.find((t) => t.value === type)?.label ?? titleCase(type);

export const plural = (count: number, word: string) =>
  `${num.format(count)} ${count === 1 ? word : /[^aeiou]y$/.test(word) ? `${word.slice(0, -1)}ies` : `${word}s`}`;

/** Readable phone: Indian mobiles as +91 98765 43210, other numbers grouped as entered. */
export function phone(v: string | null | undefined) {
  if (!v) return "—";
  if (/^[6-9]\d{9}$/.test(v)) return `+91 ${v.slice(0, 5)} ${v.slice(5)}`;
  if (/^91[6-9]\d{9}$/.test(v)) return `+91 ${v.slice(2, 7)} ${v.slice(7)}`;
  return v.replace(/(\d{4})(?=\d)/g, "$1 ");
}

/** Payment mode for display: UPI, Card, Cash, Bank transfer, Mixed. */
export const paymentLabel = (mode: string | null | undefined) =>
  !mode ? "—" : mode === "UPI" ? "UPI" : mode === "MIXED" ? "Split" : titleCase(mode).replace(/^(\w)(.*)$/, (_, a: string, b: string) => a + b.toLowerCase());

/** Payment lines for display; bills from before split payments fall back to their single mode. */
export const paymentLines = (t: { paymentMode: string; grandTotal: number; payments?: { method: string; amount: number; reference: string | null }[] }) =>
  t.payments?.length ? t.payments : [{ method: t.paymentMode, amount: t.grandTotal, reference: null }];
