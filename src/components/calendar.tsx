import { ChevronLeft, ChevronRight, CalendarDays, ChevronRight as Arrow } from "lucide-react";
import { useState } from "react";
import { type Booking, type Status, clinics, dateOf, entries, hours, key, label, monthLabel, pending, statuses, workers } from "../demo";

export function Badge({ status }: { status: Status }) {
  return <span className={"badge " + status}><i />{statuses[status]}</span>;
}

export function Calendar({ month, setMonth, today, bookings = [], selected = [], active, onDay, picking = false }: {
  month: string; setMonth: (month: string) => void; today: string; bookings?: Booking[];
  selected?: string[]; active?: string; onDay: (date: string) => void; picking?: boolean;
}) {
  const start = dateOf(month);
  const first = start.getDay();
  const days = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const items = entries(bookings);
  function move(offset: number) {
    setMonth(key(new Date(start.getFullYear(), start.getMonth() + offset, 1)).slice(0, 7));
  }
  return <section className="card calendar">
    <div className="calendar-head"><h2>{monthLabel(month)}</h2><div className="inline">
      <button className="icon-btn" aria-label="前の月" onClick={() => move(-1)}><ChevronLeft /></button>
      <button className="button small" onClick={() => setMonth(today.slice(0, 7))}>今月</button>
      <button className="icon-btn" aria-label="次の月" onClick={() => move(1)}><ChevronRight /></button>
    </div></div>
    <div className="calendar-grid">
      {["日", "月", "火", "水", "木", "金", "土"].map((day, i) => <div className={"weekday weekday-" + i} key={day}>{day}</div>)}
      {Array.from({ length: Math.ceil((first + days) / 7) * 7 }, (_, i) => {
        const day = i - first + 1;
        if (day < 1 || day > days) return <div className="day filler" key={i} />;
        const date = month + "-" + String(day).padStart(2, "0");
        const rank = selected.indexOf(date);
        const matches = items.filter(item => item.candidate.date === date);
        const counts = [
          { text: "確定", status: "confirmed", count: matches.filter(item => item.booking.status === "confirmed").length },
          { text: "仮予約", status: "tentative", count: matches.filter(item => item.booking.status === "tentative").length },
          { text: "希望候補", status: "requested", count: matches.filter(item => pending(item.booking)).length },
          { text: "完了", status: "completed", count: matches.filter(item => item.booking.status === "completed").length },
          { text: "取消", status: "cancelled", count: matches.filter(item => item.booking.status === "cancelled").length },
        ].filter(count => count.count);
        return <button key={i} className={["day", active === date || rank >= 0 ? "chosen" : "", date === today ? "today" : ""].join(" ")}
          disabled={picking && (date < today || (rank < 0 && selected.length >= 3))}
          aria-pressed={active === date || rank >= 0}
          aria-label={[label(date, true), ...counts.map(count => count.text + " " + count.count + "件")].join("、")}
          onClick={() => onDay(date)}>
          <span className="day-number">{day}</span>
          {rank >= 0 && <span className="day-count confirmed">第{rank + 1}候補</span>}
          {counts.map(count => <span className={"day-count " + count.status} key={count.status}><span>{count.text}</span><b>{count.count}</b></span>)}
        </button>;
      })}
    </div>
  </section>;
}

export function BookingRow({ booking, rank, date, slot, open }: {
  booking: Booking; rank?: number; date?: string; slot?: string; open: () => void;
}) {
  const clinic = clinics[booking.clinic];
  return <button className="booking-row" onClick={open}>
    <span className="row-icon"><CalendarDays size={18} /></span>
    <span className="row-copy"><strong>{clinic.name}</strong><small>{[clinic.area, date, slot, rank ? "第" + rank + "候補" : "", booking.worker === undefined ? "" : workers[booking.worker][0]].filter(Boolean).join(" · ")}</small></span>
    <Badge status={booking.status} /><Arrow size={16} className="row-arrow" />
  </button>;
}

export function Schedule({ bookings, today, initialDate, open, doctor }: {
  bookings: Booking[]; today: string; initialDate: string; open: (booking: Booking) => void; doctor: boolean;
}) {
  const [month, setMonth] = useState(initialDate.slice(0, 7));
  const [active, setActive] = useState(initialDate);
  const [filter, setFilter] = useState("all");
  const monthOnly = bookings.filter(booking => booking.status === "tentative" && booking.month === month && !booking.chosen);
  const matches = entries(bookings).filter(({ booking, candidate }) => candidate.date === active &&
    (filter === "all" || (filter === "requested" ? pending(booking) : filter === booking.status)));
  return <div className="schedule">
    <div><Calendar month={month} setMonth={value => { setMonth(value); setActive(value + "-01"); }} today={today} bookings={bookings} active={active} onDay={setActive} />
      <div className="legend">{(["requested", "tentative", "confirmed", "completed"] as const).map(status => <Badge status={status} key={status} />)}</div>
      {monthOnly.length > 0 && <section className="card panel"><h2>日付未定の仮予約</h2><p className="muted">{monthLabel(month)}の予定</p>
        {monthOnly.map(booking => <BookingRow key={booking.id} booking={booking} open={() => open(booking)} />)}
      </section>}
      {bookings.some(booking => booking.status === "tentative" && booking.month && !booking.chosen && booking.month !== month) &&
        <div className="month-links"><span>日付未定の仮予約がある月</span>{[...new Set(bookings.filter(booking => booking.status === "tentative" && booking.month && !booking.chosen).map(booking => booking.month!))].filter(value => value !== month).sort().map(value => <button key={value} className="button small" onClick={() => { setMonth(value); setActive(value + "-01"); }}>{monthLabel(value)}</button>)}</div>}
    </div>
    <section className="card panel daily" aria-label="日別の予約">
      <h2>{label(active)}</h2>
      <div className="daily-tools"><p className="muted">{matches.length}件の予定</p>
        {!doctor && <select aria-label="予約状態で絞り込む" value={filter} onChange={event => setFilter(event.target.value)}>
          <option value="all">すべての状態</option><option value="requested">希望候補</option><option value="confirmed">確定</option><option value="tentative">仮予約</option><option value="completed">完了</option><option value="cancelled">キャンセル</option>
        </select>}
      </div>
      <div className="day-list">{matches.length ? matches.map(({ booking, candidate, rank }) => <BookingRow key={booking.id} booking={booking} rank={rank} slot={candidate.slot + " " + hours[candidate.slot]} open={() => open(booking)} />) : <p className="empty">この日の該当する予定はありません。</p>}</div>
    </section>
  </div>;
}
