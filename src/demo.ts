export const statuses = {
  requested: "日程調整中", tentative: "仮予約", confirmed: "確定",
  rescheduling: "変更調整中", completed: "完了", cancelled: "キャンセル",
} as const;
export type Status = keyof typeof statuses;
export const slots = ["午前", "午後", "終日"] as const;
export type Slot = typeof slots[number];
export const hours: Record<Slot, string> = { 午前: "9:00〜12:00", 午後: "13:00〜17:00", 終日: "9:00〜17:00" };
export type Candidate = { date: string; slot: Slot; note: string };
export type Booking = {
  id: string; clinic: number; status: Status; candidates: Candidate[];
  chosen?: Candidate; worker?: number; month?: string;
};
export type Message = { id: string; clinic: number; from: "doctor" | "worker" | "system"; text: string; time: string; unread?: boolean };
export type Data = { bookings: Booking[]; messages: Message[] };
export const workers = [
  ["田中 健太", "大阪府"], ["山本 美咲", "兵庫県"], ["中村 直人", "京都府"],
  ["小林 遥", "東京都"], ["藤井 拓海", "奈良県"], ["森 彩乃", "滋賀県"],
];
export const clinics = [
  "さくら歯科医院", "青葉デンタルクリニック", "中央歯科医院", "みなと歯科",
  "こもれび歯科", "ひかり歯科医院", "なぎさデンタル", "花みずき歯科",
  "みどり歯科クリニック", "風の丘デンタル", "しおさい歯科", "はるの歯科医院",
  "白樺デンタル", "あかつき歯科", "すずらん歯科医院",
].map((name, id) => ({ id, name, worker: id % workers.length, area: workers[id % workers.length][1], closed: id % 3 === 0 ? "木・日" : "日・祝" }));
export function key(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}
export function dateOf(value: string) { return new Date(value.length === 7 ? value + "-01T00:00:00" : value + "T00:00:00"); }
export function shift(value: string, days: number) {
  const date = dateOf(value);
  date.setDate(date.getDate() + days);
  return key(date);
}
export function label(value: string, year = false) {
  return dateOf(value).toLocaleDateString("ja-JP", { ...(year ? { year: "numeric" } : {}), month: "long", day: "numeric", weekday: "short" });
}
export function monthLabel(value: string) {
  return dateOf(value).toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
}
export function demoThursday(today: string) {
  const start = shift(today, 7);
  return shift(start, (4 - dateOf(start).getDay() + 7) % 7);
}
export function seed(today: string): Data {
  const thursday = demoThursday(today);
  const make = (date: string, slot: Slot = "午前"): Candidate => ({ date, slot, note: "" });
  const bookings: Booking[] = Array.from({ length: 22 }, (_, i) => ({
    id: "request-" + i, clinic: 1 + i % (clinics.length - 1), status: "requested",
    candidates: [make(thursday, slots[i % 3]), make(shift(thursday, 7 + i % 3), "午後")],
  }));
  bookings.push(
    { id: "confirmed-sakura", clinic: 0, status: "confirmed", worker: 0, candidates: [], chosen: make(shift(thursday, 7)) },
    { id: "confirmed-2", clinic: 2, status: "confirmed", worker: 2, candidates: [], chosen: make(thursday, "午後") },
    { id: "confirmed-3", clinic: 4, status: "confirmed", worker: 4, candidates: [], chosen: make(shift(today, 2), "午後") },
    { id: "tentative-day", clinic: 5, status: "tentative", candidates: [], chosen: make(thursday, "終日") },
    { id: "tentative-month", clinic: 0, status: "tentative", candidates: [], month: (Number(today.slice(0, 4)) + 1) + "-06" },
    { id: "past", clinic: 0, status: "completed", worker: 0, candidates: [], chosen: make(shift(today, -4)) },
  );
  return { bookings, messages: [
    { id: "welcome", clinic: 0, from: "worker", text: "さくら歯科医院さま、いつもありがとうございます。清掃日程のご相談はこちらからお送りください。", time: today + "T09:00:00" },
    { id: "reply", clinic: 0, from: "doctor", text: "ありがとうございます。次回もよろしくお願いいたします。", time: today + "T09:15:00", unread: true },
    { id: "other", clinic: 1, from: "doctor", text: "受付と診療室の床清掃をお願いします。", time: today + "T10:00:00", unread: true },
  ] };
}
export const pending = (booking: Booking) => booking.status === "requested" || booking.status === "rescheduling";
export function entries(bookings: Booking[]) {
  return bookings.flatMap(booking => (pending(booking) ? booking.candidates : booking.chosen ? [booking.chosen] : [])
    .map((candidate, index) => ({ booking, candidate, rank: pending(booking) ? index + 1 : 0 })));
}
export function createDemoId() {
  // getRandomValues also works when the demo is opened over HTTP on a LAN.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}
export function newMessage(clinic: number, from: Message["from"], text: string): Message {
  return { id: createDemoId(), clinic, from, text, time: new Date().toISOString(), unread: from === "doctor" };
}
export const storageKey = "keizu-clean-demo-v1";
export function readData(today: string): Data {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const data = JSON.parse(raw) as Data;
      if (Array.isArray(data.bookings) && Array.isArray(data.messages)) return data;
    }
  } catch { /* The demo can still run in memory. */ }
  return seed(today);
}
