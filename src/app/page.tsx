"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Building2, CalendarCheck, CalendarDays, CalendarPlus, ChevronRight, ClipboardList, Clock3, House, Info, LayoutDashboard, MessageCircle, RotateCcw, ShieldCheck, Sparkles, Users, Wrench } from "lucide-react";
import { type Booking, type Candidate, type Data, clinics, demoThursday, hours, key, label, newMessage, pending, readData, seed, statuses, storageKey, workers } from "../demo";
import { BookingRow, Schedule } from "../components/calendar";
import { BookingDetail, Chat, Modal, RequestForm, TentativeForm } from "../components/forms";

type Mode = "doctor" | "worker" | "admin";
type Page = "home" | "request" | "calendar" | "chat" | "clinics" | "workers";
const modes = { doctor: "先生", worker: "作業員", admin: "管理者" };
const menus = {
  doctor: [{ id: "home", title: "ホーム", icon: House }, { id: "request", title: "希望日提出", icon: CalendarPlus }, { id: "calendar", title: "予約カレンダー", icon: CalendarDays }, { id: "chat", title: "メッセージ", icon: MessageCircle }],
  worker: [{ id: "home", title: "ダッシュボード", icon: LayoutDashboard }, { id: "calendar", title: "予約管理カレンダー", icon: CalendarDays }, { id: "chat", title: "メッセージ", icon: MessageCircle }],
  admin: [{ id: "home", title: "管理ダッシュボード", icon: LayoutDashboard }, { id: "clinics", title: "医院一覧", icon: Building2 }, { id: "workers", title: "作業員一覧", icon: Users }, { id: "calendar", title: "全体予約カレンダー", icon: CalendarDays }],
} satisfies Record<Mode, { id: Page; title: string; icon: typeof House }[]>;

export default function App() {
  const [initial, setInitial] = useState<{ today: string; data: Data } | null>(null);
  useEffect(() => {
    const today = key(new Date());
    // Load browser state after hydration. The server and first client render match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInitial({ today, data: readData(today) });
  }, []);
  return initial ? <Portal today={initial.today} initialData={initial.data} /> : <main className="loading"><Sparkles /> ケイズクリーン <span className="demo">DEMO</span></main>;
}

function Portal({ today, initialData }: { today: string; initialData: Data }) {
  const [data, setData] = useState(initialData);
  const [mode, setMode] = useState<Mode>("doctor");
  const [page, setPage] = useState<Page>("home");
  const [draft, setDraft] = useState<Candidate[]>([]);
  const [detailId, setDetailId] = useState("");
  const [dialog, setDialog] = useState<"reset" | "tentative" | null>(null);
  const [toast, setToast] = useState("");
  const [storageError, setStorageError] = useState(false);
  const [clinic, setClinic] = useState(0);
  const [messagesDraft, setMessagesDraft] = useState<Record<string, string>>({});
  const [focusDay, setFocusDay] = useState("");
  const [confirmedDay, setConfirmedDay] = useState("");
  const doctor = mode === "doctor";
  const worker = mode === "worker";
  const admin = mode === "admin";
  const detail = data.bookings.find(booking => booking.id === detailId);
  const own = data.bookings.filter(booking => booking.clinic === 0);
  const upcoming = data.bookings.filter(booking => booking.status === "confirmed" && booking.chosen && booking.chosen.date >= today)
    .sort((a, b) => a.chosen!.date.localeCompare(b.chosen!.date));
  const next = upcoming.find(booking => booking.clinic === 0);
  const requests = data.bookings.filter(pending);
  const monthly = data.bookings.filter(booking => booking.status === "confirmed" && booking.chosen?.date.startsWith(today.slice(0, 7)));
  const tentativeCount = data.bookings.filter(booking => booking.status === "tentative").length;
  const unread = data.messages.filter(message => message.unread).length;
  const chatClinic = doctor ? 0 : clinic;
  const chatKey = mode + "-" + chatClinic;
  const busyDay = demoThursday(today);

  function persist(nextData: Data) {
    setData(nextData);
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextData));
      setStorageError(false);
    } catch { setStorageError(true); }
  }
  function readThread(id: number) {
    setClinic(id);
    if (data.messages.some(message => message.clinic === id && message.unread)) {
      persist({ ...data, messages: data.messages.map(message => message.clinic === id ? { ...message, unread: false } : message) });
    }
  }
  function go(target: Page) {
    setPage(target);
    setFocusDay("");
    if (target === "chat" && worker) readThread(clinic);
    window.scrollTo({ top: 0 });
  }
  function switchMode(target: Mode) {
    if (mode === target) return;
    setMode(target);
    setDetailId("");
    setToast("");
    go("home");
  }
  function submit() {
    if (!doctor || draft.length < 1 || draft.length > 3 || new Set(draft.map(item => item.date)).size !== draft.length || draft.some(item => item.date < key(new Date()))) return;
    const booking: Booking = { id: crypto.randomUUID(), clinic: 0, status: "requested", candidates: draft.map(item => ({ ...item, note: item.note.trim() })) };
    persist({ ...data, bookings: [booking, ...data.bookings] });
    setDraft([]);
    go("calendar");
    setFocusDay(booking.candidates[0].date);
    setToast("希望日を送信しました。現在、日程調整中です。");
  }
  function saveBooking(booking: Booking, message?: Data["messages"][number]) {
    persist({
      bookings: data.bookings.map(item => item.id === booking.id ? booking : item),
      messages: message ? [...data.messages, message] : data.messages,
    });
    setDetailId("");
  }
  function confirm(date: string, assignee: number) {
    if (!worker || !detail || !pending(detail) || !workers[assignee]) return;
    const chosen = detail.candidates.find(item => item.date === date && item.date >= key(new Date()));
    if (!chosen) return;
    saveBooking({ ...detail, chosen, worker: assignee, status: "confirmed" },
      newMessage(detail.clinic, "system", "清掃日程が確定しました。\n" + label(date, true) + " " + chosen.slot + " " + hours[chosen.slot] + "\n担当 " + workers[assignee][0]));
    if (detail.clinic === 0) setConfirmedDay(date);
    setToast("清掃日程を確定し、チャットにお知らせを追加しました。");
  }
  function change(status: Booking["status"]) {
    if (!worker || !detail || detail.status === "cancelled" || detail.status === "completed") return;
    if (status !== "cancelled" && detail.status !== "confirmed") return;
    const candidates = status === "rescheduling" && !detail.candidates.length && detail.chosen ? [detail.chosen] : detail.candidates;
    saveBooking({ ...detail, status, candidates, month: status === "cancelled" ? undefined : detail.month });
    setToast("予約状態を「" + statuses[status] + "」に更新しました。");
  }
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 5500);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const title = menus[mode].find(item => item.id === page)?.title;
  const open = (booking: Booking) => setDetailId(booking.id);
  const doctorActions = [
    { icon: CalendarPlus, title: "希望日を送る", copy: "最大3日まで候補を選べます", page: "request" },
    { icon: CalendarDays, title: "予約を確認する", copy: "清掃の日程と調整状況を確認", page: "calendar" },
    { icon: MessageCircle, title: "メッセージ", copy: "清掃チームに相談・連絡", page: "chat" },
  ] as const;
  const stats = admin ? [
    { icon: Building2, title: "登録医院数", value: clinics.length, color: "teal" }, { icon: Users, title: "作業員数", value: workers.length, color: "violet" },
    { icon: CalendarCheck, title: "今月の確定予約", value: monthly.length, color: "green" }, { icon: ClipboardList, title: "未処理の予約", value: requests.length, color: "blue" },
  ] : [
    { icon: ClipboardList, title: "未処理の希望日提出", value: requests.length, color: "blue" }, { icon: CalendarCheck, title: "今月の確定予約", value: monthly.length, color: "green" },
    { icon: Clock3, title: "仮予約", value: tentativeCount, color: "amber" }, { icon: MessageCircle, title: "未読メッセージ", value: unread, color: "violet" },
  ];

  return <div className="shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark"><Sparkles size={22} /></span><div><strong>ケイズクリーン</strong><small>清掃予約ポータル</small></div><span className="demo">DEMO</span></div>
      <div className="switcher" aria-label="デモモード切り替え"><span>デモモード</span><div className="segments">
        {([["doctor", Building2], ["worker", Wrench], ["admin", ShieldCheck]] as const).map(([item, Icon]) =>
          <button key={item} aria-label={modes[item] + "モード"} aria-pressed={mode === item} onClick={() => switchMode(item)}><Icon size={15} />{modes[item]}</button>)}
      </div></div>
      <button className="reset" onClick={() => setDialog("reset")}><RotateCcw size={16} /><span>デモをリセット</span></button>
    </header>
    <aside className="sidebar">
      <p className="nav-caption">ワークスペース</p>
      <nav aria-label="メインメニュー">{menus[mode].map(({ id, title, icon: Icon }) =>
        <button key={id} aria-current={page === id ? "page" : undefined} onClick={() => go(id)}><Icon size={19} /><span>{title}</span>{page === id && <i />}</button>)}</nav>
      <div className="identity"><span>{doctor ? <Building2 size={19} /> : admin ? <ShieldCheck size={19} /> : <Wrench size={19} />}</span><div><strong>{doctor ? clinics[0].name : admin ? "運営管理チーム" : "清掃チーム"}</strong><small>{modes[mode]}モード</small></div></div>
    </aside>
    <main className="main" id="main">
      <div className="content">
        <div className="breadcrumb"><span>{modes[mode]}モード</span><ChevronRight size={14} />{title}</div>
        {storageError && <p className="info" role="alert">ブラウザに保存できません。この画面を開いている間は操作できます。</p>}
        {page === "home" && doctor ? <>
          <div className="page-heading welcome"><div><p className="eyebrow">CLINIC PORTAL</p><h1>{clinics[0].name} 様</h1><p>清掃のご予約や、ケイズクリーンへのご連絡はこちらから。</p></div><span className="today-label"><CalendarDays size={17} />{label(today, true)}</span></div>
          <section className="hero">
            <div className="hero-art" aria-hidden="true"><div /><CalendarCheck strokeWidth={1.15} /><Sparkles strokeWidth={1.25} /></div>
            <p className="hero-kicker"><CalendarDays size={17} /> 次回の清掃予定</p>
            {next?.chosen ? <><div className="hero-date">{label(next.chosen.date, true)}</div><p className="hero-time"><Clock3 size={17} /> {next.chosen.slot}　{hours[next.chosen.slot]}</p><span className="hero-badge"><CalendarCheck size={15} /> 予約確定</span></> :
              <><div className="hero-date">次回の日程は調整前です</div><p className="hero-time">希望日を選んで清掃チームに送れます。</p>{own.some(pending) && <span className="hero-badge">日程調整中</span>}</>}
            <button className="hero-link" onClick={() => next ? open(next) : go("calendar")}>予約の詳細を見る <ArrowRight size={17} /></button>
          </section>
          <section><div className="section-head section-space"><h2>清掃予約メニュー</h2></div><div className="action-grid">{doctorActions.map(({ icon: Icon, title, copy, page }) =>
            <button className="card action-card" key={page} onClick={() => go(page)}><span className="action-icon"><Icon size={23} /></span><span><strong>{title}</strong><small>{copy}</small></span><ChevronRight size={18} /></button>)}</div></section>
          <section className="card panel news"><h2>最近のお知らせ</h2>
            {own.filter(pending).slice(0, 2).map(booking => <BookingRow key={booking.id} booking={booking} date="希望日を受け付けました" open={() => open(booking)} />)}
            <div className="news-item"><span className="row-icon"><Info size={18} /></span><div><strong>清掃予約ポータルへようこそ</strong><p className="muted">希望日の送信から確定日程の確認まで、このポータルでご利用いただけます。</p></div></div>
          </section>
        </> : <>
          <div className="page-heading"><div><p className="eyebrow">{doctor ? "CLINIC PORTAL" : worker ? "OPERATIONS" : "ADMINISTRATION"}</p><h1>{title}</h1>
            <p>{page === "home" ? "予約状況と対応が必要な項目を確認できます。" : page === "request" ? "ご都合のよい日を最大3日選び、希望時間帯を入力してください。" : page === "calendar" ? "カレンダーの日付を選ぶと、その日の予定を確認できます。" : page === "chat" ? "清掃日程や作業内容について連絡できます。" : "登録情報を確認できます。"}</p></div>
            {worker && (page === "home" || page === "calendar") && <button className="button primary" onClick={() => setDialog("tentative")}><CalendarPlus />仮予約を登録</button>}
          </div>
          {page === "home" && <>
            <div className="stats">{stats.map(({ icon: Icon, title, value, color }, index) => <div className="card stat" key={title}><span className={"stat-icon " + color}><Icon size={22} /></span><p>{title}</p><strong>{value}</strong><small> {admin && index === 1 ? "名" : admin && index === 0 ? "院" : "件"}</small></div>)}</div>
            <div className="dashboard-grid"><section className="card panel"><div className="section-head"><h2>対応待ちの予約</h2><span className="tag">{requests.length}件</span></div>
              <div className="dashboard-list">{requests.length ? requests.map(booking => <BookingRow key={booking.id} booking={booking} date={booking.candidates.length + "候補"} open={() => open(booking)} />) : <p className="empty">対応待ちの予約はありません。</p>}</div>
            </section><section className="card panel"><div className="section-head"><h2>近日中の作業予定</h2></div>
              {upcoming.length ? upcoming.slice(0, 6).map(booking => <BookingRow key={booking.id} booking={booking} date={label(booking.chosen!.date)} slot={booking.chosen!.slot} open={() => open(booking)} />) : <p className="empty">今後の確定予定はありません。</p>}
              <button className="button full" onClick={() => go("calendar")}>カレンダーを見る<ArrowRight /></button>
            </section></div>
          </>}
          {page === "request" && <RequestForm today={today} draft={draft} setDraft={setDraft} submit={submit} />}
          {page === "calendar" && <Schedule key={mode + focusDay} bookings={doctor ? own : data.bookings} today={today} initialDate={focusDay || (doctor ? confirmedDay || next?.chosen?.date || today : busyDay)} open={open} doctor={doctor} />}
          {page === "chat" && <Chat doctor={doctor} messages={data.messages} clinic={chatClinic} select={readThread} draft={messagesDraft[chatKey] ?? ""}
            setDraft={text => setMessagesDraft(prev => ({ ...prev, [chatKey]: text }))} send={text => {
              persist({ ...data, messages: [...data.messages, newMessage(chatClinic, doctor ? "doctor" : "worker", text)] });
              setMessagesDraft(prev => ({ ...prev, [chatKey]: "" }));
            }} />}
          {page === "clinics" && <ClinicList />}
          {page === "workers" && <div className="people-grid">{workers.map(([name, area], id) => <section className="card panel person" key={name}>
            <span className="action-icon"><Wrench size={21} /></span><h2>{name}</h2><p className="muted">担当エリア　{area}</p><dl><div><dt>担当医院</dt><dd>{clinics.filter(item => item.worker === id).length}院</dd></div><div><dt>今月の確定作業</dt><dd>{monthly.filter(item => item.worker === id).length}件</dd></div></dl>
          </section>)}</div>}
        </>}
        <footer><span>ケイズクリーン 清掃予約ポータル</span><span>デモデータはこのブラウザに保存されます。</span></footer>
      </div>
    </main>
    {toast && <div className="toast" role="status"><CalendarCheck size={20} />{toast}</div>}
    {detail && <BookingDetail key={detail.id} booking={detail} today={today} workerMode={worker} close={() => setDetailId("")} confirm={confirm} change={change} />}
    {dialog === "tentative" && <TentativeForm today={today} close={() => setDialog(null)} save={booking => {
      persist({ ...data, bookings: [booking, ...data.bookings] });
      setDialog(null);
      go("calendar");
      setFocusDay(booking.chosen?.date ?? booking.month + "-01");
      setToast("仮予約を登録しました。");
    }} />}
    {dialog === "reset" && <Modal title="デモをリセット" close={() => setDialog(null)}><p>このブラウザで追加した予約やメッセージを削除し、初期データに戻します。</p><div className="actions"><button className="button" onClick={() => setDialog(null)}>戻る</button><button className="button primary" onClick={() => {
      persist(seed(today)); setDraft([]); setMessagesDraft({}); setConfirmedDay(""); setClinic(0); setMode("doctor"); go("home"); setDialog(null); setToast("デモを初期状態に戻しました。");
    }}>初期状態に戻す</button></div></Modal>}
  </div>;
}

function ClinicList() {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("");
  const [active, setActive] = useState<number | null>(null);
  const visible = clinics.filter(item => (!area || area === item.area) && item.name.includes(query.trim()));
  const clinic = active === null ? null : clinics[active];
  return <section className="card panel"><div className="directory-tools"><input aria-label="医院名で検索" placeholder="医院名で検索" value={query} onChange={event => setQuery(event.target.value)} />
    <select aria-label="所在地で絞り込む" value={area} onChange={event => setArea(event.target.value)}><option value="">すべての地域</option>{workers.map(([, value]) => <option key={value}>{value}</option>)}</select></div>
    <p className="muted">{visible.length}院</p>
    {visible.map(item => <button key={item.id} className="booking-row" onClick={() => setActive(item.id)}><span className="row-icon"><Building2 size={19} /></span><span className="row-copy"><strong>{item.name}</strong><small>{item.area} · 休診日 {item.closed} · 担当 {workers[item.worker][0]}</small></span><ChevronRight size={17} /></button>)}
    {!visible.length && <p className="empty">条件に合う医院はありません。</p>}
    {clinic && <Modal title={clinic.name} close={() => setActive(null)}><dl><div><dt>所在地</dt><dd>{clinic.area}</dd></div><div><dt>休診日</dt><dd>{clinic.closed}</dd></div><div><dt>担当作業員</dt><dd>{workers[clinic.worker][0]}</dd></div></dl></Modal>}
  </section>;
}
