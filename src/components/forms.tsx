import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, CalendarPlus, Check, Send, X } from "lucide-react";
import { type Booking, type Candidate, type Message, type Slot, clinics, hours, label, monthLabel, pending, slots, workers } from "../demo";
import { Badge, Calendar } from "./calendar";

export function Modal({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} aria-label={title} onCancel={event => { event.preventDefault(); close(); }}>
    <div className="modal-body"><div className="section-head"><h2>{title}</h2><button className="icon-btn" aria-label="閉じる" onClick={close}><X /></button></div>{children}</div>
  </dialog>;
}

export function RequestForm({ today, draft, setDraft, submit }: {
  today: string; draft: Candidate[]; setDraft: (draft: Candidate[]) => void; submit: () => void;
}) {
  const [month, setMonth] = useState(draft[0]?.date.slice(0, 7) ?? today.slice(0, 7));
  const [review, setReview] = useState(false);
  const valid = draft.length > 0 && draft.length <= 3 && new Set(draft.map(item => item.date)).size === draft.length && draft.every(item => item.date >= today);
  function toggle(date: string) {
    if (draft.some(item => item.date === date)) setDraft(draft.filter(item => item.date !== date));
    else if (draft.length < 3 && date >= today) setDraft([...draft, { date, slot: "午前", note: "" }]);
  }
  function edit(index: number, patch: Partial<Candidate>) {
    setDraft(draft.map((item, i) => i === index ? { ...item, ...patch } : item));
  }
  return <><div className="steps"><span className={!review ? "current" : ""}>1　希望日を入力</span><ArrowRight size={16} /><span className={review ? "current" : ""}>2　内容を確認</span></div>
    {review ? <section className="card panel review"><h2>送信内容を確認</h2><p className="muted">希望日を送ると、作業員が日程を調整します。</p>
      {draft.map((item, i) => <div className="candidate" key={item.date}><span className="tag">第{i + 1}候補</span><h3>{label(item.date, true)}</h3><p>{item.slot}　{hours[item.slot]}</p>{item.note && <p className="note">{item.note}</p>}</div>)}
      <div className="actions"><button className="button" onClick={() => setReview(false)}><ArrowLeft />入力に戻る</button><button className="button primary" disabled={!valid} onClick={submit}><Send />希望日を送信する</button></div>
    </section> : <div className="schedule request-grid">
      <Calendar month={month} setMonth={setMonth} today={today} selected={draft.map(item => item.date)} onDay={toggle} picking />
      <section className="card panel"><div className="section-head"><h2>選んだ希望日</h2><span className="tag">{draft.length} / 3</span></div>
        <p className="muted">選んだ順に第1〜第3候補になります。</p>
        {draft.length === 0 && <p className="empty">カレンダーから希望日を選んでください。</p>}
        {draft.map((item, i) => <div className="candidate" key={item.date}>
          <div className="section-head"><span className="tag">第{i + 1}候補</span><button className="icon-btn" aria-label={label(item.date) + "を外す"} onClick={() => toggle(item.date)}><X size={16} /></button></div>
          <h3>{label(item.date, true)}</h3>
          <label>希望時間帯<select value={item.slot} onChange={event => edit(i, { slot: event.target.value as Slot })}>{slots.map(slot => <option key={slot}>{slot}</option>)}</select></label>
          <label>備考（任意）<textarea rows={2} maxLength={500} value={item.note} placeholder="例：診療室の床清掃をお願いします" onChange={event => edit(i, { note: event.target.value })} /></label>
        </div>)}
        <button className="button primary full" disabled={!valid} onClick={() => setReview(true)}>確認する<ArrowRight /></button>
      </section>
    </div>}
  </>;
}

export function BookingDetail({ booking, today, workerMode, close, confirm, change }: {
  booking: Booking; today: string; workerMode: boolean; close: () => void;
  confirm: (date: string, worker: number) => void; change: (status: Booking["status"]) => void;
}) {
  const [date, setDate] = useState("");
  const [worker, setWorker] = useState(booking.worker ?? clinics[booking.clinic].worker);
  const canConfirm = workerMode && pending(booking);
  const options = pending(booking) ? booking.candidates : booking.chosen ? [booking.chosen] : [];
  return <Modal title="予約詳細" close={close}>
    <div className="section-head detail-head"><div><h3>{clinics[booking.clinic].name}</h3><p className="muted">{clinics[booking.clinic].area}{booking.worker !== undefined && " · " + workers[booking.worker][0]}</p></div><Badge status={booking.status} /></div>
    {(pending(booking) || booking.status === "tentative") && <p className="info">日程はまだ確定していません。</p>}
    {booking.month && !booking.chosen && <p className="candidate">{monthLabel(booking.month)}（日付未定）</p>}
    {options.map((item, i) => <div className={"candidate " + (date === item.date ? "selected-option" : "")} key={item.date}>
      {canConfirm ? <label className="radio"><input type="radio" name="candidate" checked={date === item.date} disabled={item.date < today} onChange={() => setDate(item.date)} /><strong>第{i + 1}候補　{label(item.date, true)}</strong></label> : <h3>{pending(booking) ? "第" + (i + 1) + "候補　" : ""}{label(item.date, true)}</h3>}
      <p>{item.slot}　{hours[item.slot]}{canConfirm && item.date < today && "（受付終了）"}</p>{item.note && <p className="note">{item.note}</p>}
    </div>)}
    {canConfirm && <><label>担当作業員<select value={worker} onChange={event => setWorker(Number(event.target.value))}>{workers.map(([name], i) => <option value={i} key={name}>{name}</option>)}</select></label><button className="button primary full" disabled={!date || date < today} onClick={() => confirm(date, worker)}><Check />この日程で確定</button></>}
    {workerMode && booking.status !== "cancelled" && booking.status !== "completed" && <div className="actions">
      {booking.status === "confirmed" && <><button className="button" onClick={() => change("completed")}>完了にする</button><button className="button" onClick={() => change("rescheduling")}>変更調整にする</button></>}
      <button className="button danger" onClick={() => change("cancelled")}>キャンセルにする</button>
    </div>}
  </Modal>;
}

export function TentativeForm({ today, close, save }: { today: string; close: () => void; save: (booking: Booking) => void }) {
  const [clinic, setClinic] = useState(0);
  const [kind, setKind] = useState("month");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [slot, setSlot] = useState<Slot>("午前");
  const year = Number(today.slice(0, 4)) + 1;
  const min = year + "-01", max = year + "-12";
  const valid = kind === "month" ? month >= min && month <= max : day >= min + "-01" && day <= max + "-31";
  return <Modal title="仮予約を登録" close={close}><p className="muted">{year}年の清掃予定を仮予約として登録します。</p>
    <form onSubmit={event => { event.preventDefault(); if (valid) save({
      id: crypto.randomUUID(), clinic, worker: clinics[clinic].worker, status: "tentative", candidates: [],
      ...(kind === "month" ? { month } : { chosen: { date: day, slot, note: "" } }),
    }); }}>
      <label>医院<select value={clinic} onChange={event => setClinic(Number(event.target.value))}>{clinics.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <label>予定の登録方法<select value={kind} onChange={event => setKind(event.target.value)}><option value="month">予定月のみ（日付未定）</option><option value="day">予定日を指定</option></select></label>
      {kind === "month" ? <label>予定月<input type="month" min={min} max={max} required value={month} onChange={event => setMonth(event.target.value)} /></label> :
        <><label>予定日<input type="date" min={min + "-01"} max={max + "-31"} required value={day} onChange={event => setDay(event.target.value)} /></label>
        <label>時間帯<select value={slot} onChange={event => setSlot(event.target.value as Slot)}>{slots.map(item => <option key={item}>{item}</option>)}</select></label></>}
      <button className="button primary full" disabled={!valid}><CalendarPlus />仮予約を保存</button>
    </form>
  </Modal>;
}

export function Chat({ doctor, messages, clinic, select, send, draft, setDraft }: {
  doctor: boolean; messages: Message[]; clinic: number; select: (clinic: number) => void;
  send: (text: string) => void; draft: string; setDraft: (text: string) => void;
}) {
  const thread = messages.filter(item => item.clinic === clinic);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [thread.length, clinic]);
  return <div className={"chat-layout " + (doctor ? "single" : "")}>
    {!doctor && <section className="card panel contacts"><h2>医院とのやりとり</h2><label className="mobile-contact">医院を選ぶ<select value={clinic} onChange={event => select(Number(event.target.value))}>{clinics.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="contact-list">{clinics.map(item => {
      const unread = messages.filter(message => message.clinic === item.id && message.unread).length;
      return <button className={item.id === clinic ? "active" : ""} key={item.id} onClick={() => select(item.id)}>{item.name}{unread > 0 && <span className="tag">{unread}</span>}</button>;
    })}</div></section>}
    <section className="card chat"><div className="chat-head"><h2>{doctor ? "ケイズクリーン 清掃チーム" : clinics[clinic].name}</h2><p className="muted">デモメッセージ</p></div>
      <div className="messages" aria-label="メッセージ履歴">
        {!thread.length && <p className="empty">メッセージはまだありません。</p>}
        {thread.map(item => <div key={item.id} className={"message " + (item.from === "system" ? "system" : item.from === (doctor ? "doctor" : "worker") ? "mine" : "")}>
          <p>{item.text}</p><small>{new Date(item.time).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</small>
        </div>)}<div ref={end} />
      </div>
      {doctor && <div className="quick">{["清掃の希望日を送信しました。ご確認をお願いいたします。", "次回の清掃について相談があります。"].map((text, i) => <button className="button small" key={text} onClick={() => setDraft(text)}>{i ? "次回清掃の相談" : "希望日送信の連絡"}</button>)}</div>}
      <form className="composer" onSubmit={event => { event.preventDefault(); if (draft.trim()) send(draft.trim()); }}>
        <input aria-label="メッセージ" placeholder="メッセージを入力" maxLength={1000} value={draft} onChange={event => setDraft(event.target.value)} />
        <button className="button primary" disabled={!draft.trim()}><Send />送信</button>
      </form>
    </section>
  </div>;
}
