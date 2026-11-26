import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CalendarDays, Clock3, Plus, Trash2, Wrench } from "lucide-react";
import { api, jsonBody } from "../api";

interface Block { id: string; trackId: number; startsAt: string; endsAt: string; reason: string }
function localDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}-${parts.find((part) => part.type === "day")?.value}`;
}
function utcForLocal(date: string, hour: number) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day, hour + 3));
  return value.toISOString();
}
function label(value: string) {
  const date = new Date(value);
  return `${new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", month: "short", timeZone: "America/Argentina/Buenos_Aires" }).format(date)} · ${new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" }).format(date)}`;
}

export function AdminPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [date, setDate] = useState(localDateString());
  const [start, setStart] = useState("13");
  const [duration, setDuration] = useState("1");
  const [trackId, setTrackId] = useState("1");
  const [reason, setReason] = useState("Mantenimiento preventivo");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  const previousDay = (day + 6) % 7;
  const hours = [
    ...((previousDay >= 2 && previousDay <= 5) || previousDay === 0 || previousDay === 6 ? [0] : []),
    ...((previousDay === 0 || previousDay === 6) ? [1, 2] : []),
    ...(day === 1 ? [] : Array.from({ length: 11 }, (_, i) => i + 13))
  ];
  useEffect(() => { if (!hours.includes(Number(start))) setStart(String(hours[0] ?? 13)); }, [date]);
  const closeHour = Number(start) < 13
    ? (previousDay === 0 || previousDay === 6 ? 3 : 1)
    : (day === 0 || day === 6 ? 3 : 1);
  const maxDuration = Number(start) < 13 ? Math.max(1, closeHour - Number(start)) : (24 - Number(start)) + closeHour;

  const refresh = useCallback(async () => {
    const result = await api<{ blocks: Block[] }>("/api/admin/blocks");
    setBlocks(result.blocks.sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
  }, []);
  useEffect(() => { refresh().catch((caught) => setError(caught instanceof Error ? caught.message : "No se pudieron cargar los bloqueos.")); }, [refresh]);

  async function addBlock(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      await api("/api/admin/blocks", { method: "POST", body: jsonBody({
        trackId: Number(trackId), startsAt: utcForLocal(date, Number(start)),
        endsAt: utcForLocal(date, Number(start) + Number(duration)), reason
      }) });
      setNotice("Bloqueo creado. Esa pista no aparecerá disponible en ese horario."); await refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No se pudo crear el bloqueo."); }
    finally { setBusy(false); }
  }

  async function removeBlock(block: Block) {
    if (!window.confirm("¿Eliminar este bloqueo y volver a ofrecer la pista?")) return;
    setBusy(true); setError(""); setNotice("");
    try { await api("/api/admin/blocks/" + block.id, { method: "DELETE" }); setNotice("Bloqueo eliminado."); await refresh(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "No se pudo eliminar."); }
    finally { setBusy(false); }
  }

  return <main className="dashboard-page admin-page">
    <div className="page-heading"><div><span className="section-kicker">PANEL INTERNO · OPERACIONES</span><h1>Administración<span className="lime-text">.</span></h1><p>Bloqueá pistas por mantenimiento. Las reservas existentes se protegen automáticamente.</p></div><div className="duration-pill"><Wrench size={16} /> DOS PISTAS</div></div>
    {error && <div className="notice error-state" role="alert">{error}<button onClick={() => void refresh()}>Reintentar</button></div>}
    {notice && <div className="notice success-state" role="status">{notice}</div>}
    <section className="admin-layout">
      <form className="admin-form" onSubmit={addBlock}>
        <div className="panel-heading"><div><Wrench size={18} /><h2>Nuevo bloqueo</h2></div></div>
        <p className="muted-copy">La hora usa el huso de Buenos Aires. Se aceptan turnos futuros dentro del calendario de apertura.</p>
        <label className="field-label">Fecha<input type="date" value={date} min={localDateString()} required onChange={(event) => setDate(event.target.value)} /></label>
        <div className="admin-fields">
          <label className="field-label">Pista<select value={trackId} onChange={(event) => setTrackId(event.target.value)}><option value="1">Pista 01 · Curva Norte</option><option value="2">Pista 02 · Curva Sur</option></select></label>
          <label className="field-label">Empieza<select value={start} onChange={(event) => setStart(event.target.value)}>{hours.map((hour) => <option key={hour} value={hour}>{String(hour).padStart(2, "0")}:00</option>)}</select></label>
          <label className="field-label">Duración<select value={duration} onChange={(event) => setDuration(event.target.value)}>{Array.from({ length: maxDuration }, (_, i) => i + 1).map((length) => <option key={length} value={length}>{length} {length === 1 ? "hora" : "horas"}</option>)}</select></label>
        </div>
        <label className="field-label">Motivo<input value={reason} minLength={3} maxLength={120} required onChange={(event) => setReason(event.target.value)} /></label>
        <button className="button button-lime" type="submit" disabled={busy}><Plus size={16} /> Crear bloqueo</button>
        <div className="admin-note"><CalendarDays size={15} /> La lista incluye las horas permitidas del calendario del karting, también las continuaciones nocturnas del día anterior.</div>
      </form>
      <section className="admin-blocks"><div className="section-title-line"><div><span className="section-kicker">AGENDA OPERATIVA</span><h2>Bloqueos activos</h2></div><span className="count-pill">{blocks.length}</span></div>
        {blocks.length === 0 ? <div className="empty-dashboard"><Clock3 /><strong>No hay bloqueos cargados.</strong><span>Las dos pistas están sujetas a la disponibilidad de reservas.</span></div> : <div className="block-list">{blocks.map((block) => <article className="block-row" key={block.id}><span className="block-icon"><Wrench size={17} /></span><div><strong>{label(block.startsAt)} — {label(block.endsAt)}</strong><span>Pista {block.trackId} · {block.reason}</span></div><button className="icon-button danger-icon" aria-label="Eliminar bloqueo" title="Eliminar bloqueo" disabled={busy} onClick={() => void removeBlock(block)}><Trash2 size={17} /></button></article>)}</div>}
      </section>
    </section>
  </main>;
}
