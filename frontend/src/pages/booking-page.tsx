import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Check, Clock3, LockKeyhole, Plus, Users, X } from "lucide-react";
import { useAuth } from "../auth";
import { api, jsonBody, type SlotView } from "../api";

function localDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}-${parts.find((part) => part.type === "day")?.value}`;
}

function dateLabel(value: string) {
  const date = new Date(value + "T12:00:00Z");
  return new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(date);
}

function shortDate(value: string) {
  const date = new Date(value + "T12:00:00Z");
  return new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(date);
}

export function BookingPage() {
  const { user } = useAuth();
  const [date, setDate] = useState(localDateString());
  const [slots, setSlots] = useState<SlotView[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedStart, setSelectedStart] = useState("");
  const [guestNames, setGuestNames] = useState([""]);
  const [joinGuestNames, setJoinGuestNames] = useState<string[]>([]);
  const [policy, setPolicy] = useState<"open" | "approval">("open");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [days, setDays] = useState<string[]>([]);
  const selected = slots.find((slot) => slot.startsAt === selectedStart);

  useEffect(() => {
    const today = new Date(localDateString() + "T12:00:00Z");
    const nextDays = Array.from({ length: 14 }, (_, index) => {
      const day = new Date(today);
      day.setUTCDate(today.getUTCDate() + index);
      return localDateString(day);
    });
    setDays(nextDays);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    setSelectedStart("");
    api<{ slots: SlotView[] }>("/api/availability?date=" + encodeURIComponent(date), {}, false)
      .then((result) => { if (active) setSlots(result.slots); })
      .catch((error) => { if (active) setLoadError(error instanceof Error ? error.message : "No se pudo cargar la agenda."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [date]);

  const availableCount = useMemo(() => slots.filter((slot) => slot.canCreate || slot.sessions.some((session) => session.placesLeft > 0)).length, [slots]);

  function setGuest(index: number, value: string) {
    setGuestNames((names) => names.map((name, current) => current === index ? value : name));
  }

  async function createSession(event: FormEvent) {
    event.preventDefault();
    setActionError("");
    setMessage("");
    if (!user) {
      setActionError("Ingresá o creá una cuenta para confirmar la tanda.");
      return;
    }
    if (!selected) return;
    const names = guestNames.map((name) => name.trim()).filter(Boolean);
    if (names.length < 1) {
      setActionError("Sumá al menos a otra persona. El organizador cuenta como participante.");
      return;
    }
    setBusy(true);
    try {
      await api("/api/sessions", {
        method: "POST",
        body: jsonBody({ startsAt: selected.startsAt, guestNames: names, joinPolicy: policy })
      });
      setMessage("¡Tanda confirmada! La pista ya está reservada para tu grupo.");
      setSelectedStart("");
      const result = await api<{ slots: SlotView[] }>("/api/availability?date=" + encodeURIComponent(date), {}, false);
      setSlots(result.slots);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "No se pudo confirmar la tanda.");
    } finally {
      setBusy(false);
    }
  }

  async function joinSession(sessionId: string) {
    setActionError("");
    setMessage("");
    if (!user) {
      setActionError("Ingresá o creá una cuenta para sumarte a este grupo.");
      return;
    }
    setBusy(true);
    try {
      const result = await api<{ request: { status: string } }>("/api/sessions/" + sessionId + "/join-requests", {
        method: "POST",
        body: jsonBody({ guestNames: joinGuestNames.filter((name) => name.trim()).map((name) => name.trim()) })
      });
      setMessage(result.request.status === "approved"
        ? "Ya estás en el grupo. ¡Nos vemos en la pista!"
        : "Solicitud enviada. El anfitrión tiene que aprobarla.");
      setJoinGuestNames([]);
      const refreshed = await api<{ slots: SlotView[] }>("/api/availability?date=" + encodeURIComponent(date), {}, false);
      setSlots(refreshed.slots);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "No se pudo enviar la solicitud.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="booking-page">
      <div className="page-heading">
        <div><span className="section-kicker">RESERVAS · PISTA DOBLE</span><h1>Buscá tu tanda.</h1><p>Elegí una fecha, mirá los grupos y encontrá tu lugar.</p></div>
        <div className="duration-pill"><Clock3 size={16} /> 60 MIN POR TANDA</div>
      </div>

      <section className="booking-layout">
        <div className="availability-panel">
          <div className="panel-heading"><div><CalendarDays size={18} /><h2>Disponibilidad</h2></div><span>{availableCount} horarios con lugar</span></div>
          <div className="date-strip" aria-label="Elegir fecha">
            {days.map((day) => (
              <button key={day} className={day === date ? "date-chip selected" : "date-chip"} onClick={() => setDate(day)}>
                <span>{shortDate(day).split(" ")[0]}</span><strong>{shortDate(day).split(" ")[1]}</strong>
              </button>
            ))}
            <label className="date-picker-button" aria-label="Elegir otra fecha"><CalendarDays size={17} /><input type="date" value={date} min={localDateString()} onChange={(event) => event.target.value && setDate(event.target.value)} /></label>
          </div>
          <div className="selected-date-line"><strong>{dateLabel(date)}</strong><span>Hora local del karting</span></div>

          {loading && <div className="state-card"><span className="spinner" /> Buscando lugares libres…</div>}
          {loadError && <div className="state-card error-state"><strong>No pudimos cargar la agenda</strong><span>{loadError}</span></div>}
          {!loading && !loadError && slots.length === 0 && <div className="state-card"><strong>No hay tandas disponibles para esta fecha.</strong><span>Elegí otro día para ver la agenda.</span></div>}
          {!loading && !loadError && slots.length > 0 && (
            <div className="slot-list">
              {slots.map((slot) => {
                const joinable = slot.sessions.some((session) => session.placesLeft > 0);
                const open = slot.canCreate || joinable;
                return (
                  <button
                    key={slot.startsAt}
                    className={"slot-row" + (selectedStart === slot.startsAt ? " active" : "") + (!open ? " unavailable" : "")}
                    onClick={() => open && setSelectedStart((current) => current === slot.startsAt ? "" : slot.startsAt)}
                    disabled={!open}
                    aria-pressed={selectedStart === slot.startsAt}
                  >
                    <span className="slot-time">{slot.label}</span>
                    <span className="slot-detail">
                      {slot.sessions.length > 0 ? <><Users size={15} /> {slot.sessions.length} grupo{slot.sessions.length > 1 ? "s" : ""} · {slot.availableTracks} pista{slot.availableTracks === 1 ? "" : "s"} libre{slot.availableTracks === 1 ? "" : "s"}</> : <><span className="slot-green-dot" /> {slot.availableTracks} pistas disponibles</>}
                    </span>
                    <span className="slot-action">{!open ? "Completo" : selectedStart === slot.startsAt ? <Check size={17} /> : <ArrowRight size={16} />}</span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="schedule-note"><span className="slot-green-dot" /> Turnos de martes a viernes hasta la 01:00; fines de semana hasta las 03:00. Lunes cerrado.</div>
        </div>

        <aside className="booking-side">
          {!selected ? (
            <div className="side-empty">
              <div className="side-icon"><Users /></div>
              <span className="section-kicker">TU GRUPO, TU TANDA</span>
              <h2>Elegí una hora<br />para empezar.</h2>
              <p>Podés reservar una pista para tu grupo o sumarte a otra que tenga lugares.</p>
              <div className="capacity-line"><span>CUPO POR PISTA</span><strong>2—8</strong></div>
              <div className="capacity-line"><span>KART Y CASCO</span><strong>INCLUIDOS</strong></div>
            </div>
          ) : (
            <div className="side-form">
              <div className="side-form-top"><span className="section-kicker">TU SELECCIÓN</span><span className="selected-time">{selected.label}</span></div>
              <h2>¿Cómo querés correr?</h2>
              <p>En esta hora hay {selected.availableTracks} pista{selected.availableTracks === 1 ? "" : "s"} libre{selected.availableTracks === 1 ? "" : "s"} y {selected.sessions.length} grupo{selected.sessions.length === 1 ? "" : "s"}.</p>

              {selected.sessions.length > 0 && (
                <div className="join-options">
                  <h3>Sumarte a un grupo</h3>
                  {selected.sessions.map((session) => (
                    <div className="join-card" key={session.id}>
                      <div className="join-card-head"><span className="track-number">0{session.trackId}</span><span className={session.joinPolicy === "open" ? "policy-tag open" : "policy-tag"}>{session.joinPolicy === "open" ? "Abierto" : "Con aprobación"}</span></div>
                      <strong>{session.participantCount} / 8 pilotos</strong>
                      <small>{session.placesLeft} lugares posibles · Pista {session.trackId}</small>
                      {session.placesLeft > 0 && (
                        <button className="button button-outline full-width" disabled={busy} onClick={() => void joinSession(session.id)}>
                          {session.joinPolicy === "open" ? "Sumarme al grupo" : "Solicitar un lugar"} <ArrowRight size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {selected.canCreate && (
                <form className="form-stack compact-form" onSubmit={createSession}>
                  <div className="form-divider"><span>{selected.sessions.length > 0 ? "O reservar para mi grupo" : "Reservar para mi grupo"}</span></div>
                  <label className="field-label">Participantes <small>El organizador cuenta como uno; agregá al menos a otra persona.</small></label>
                  <div className="participant-list">
                    <div className="participant-input owner-input"><span className="participant-badge">TÚ</span><input value={user?.name ?? "Tu nombre al ingresar"} readOnly aria-label="Organizador de la reserva" /></div>
                    {guestNames.map((name, index) => (
                      <div className="participant-input" key={index}><span className="participant-badge">{String(index + 2).padStart(2, "0")}</span><input value={name} onChange={(event) => setGuest(index, event.target.value)} placeholder="Nombre del participante" required /></div>
                    ))}
                  </div>
                  <div className="participant-actions">
                    <button className="inline-action" type="button" onClick={() => setGuestNames((names) => names.length < 7 ? [...names, ""] : names)} disabled={guestNames.length >= 7}><Plus size={14} /> Agregar participante</button>
                    {guestNames.length > 1 && <button className="inline-action muted" type="button" onClick={() => setGuestNames((names) => names.slice(0, -1))}><X size={14} /> Quitar último</button>}
                  </div>
                  <div className="policy-choice">
                    <span>¿Abrir el grupo?</span>
                    <label><input type="radio" name="policy" checked={policy === "open"} onChange={() => setPolicy("open")} /><span>Abierto</span></label>
                    <label><input type="radio" name="policy" checked={policy === "approval"} onChange={() => setPolicy("approval")} /><span>Aprobar ingresos</span></label>
                  </div>
                  <p className="policy-hint">{policy === "open" ? "Quien pida lugar se suma automáticamente mientras haya cupo." : "Vas a poder revisar cada solicitud antes de aceptar."}</p>
                  {actionError && <div className="form-error" role="alert">{actionError} {!user && <Link to="/ingresar">Ingresar</Link>}</div>}
                  {message && <div className="form-success" role="status">{message}</div>}
                  <button className="button button-lime full-width" type="submit" disabled={busy}>{busy ? "Confirmando…" : "Confirmar mi tanda"} {!busy && <ArrowRight size={17} />}</button>
                  <div className="no-price-note"><LockKeyhole size={13} /> No se realiza ningún cobro en línea.</div>
                </form>
              )}
            </div>
          )}
        </aside>
      </section>
      {!selected && (actionError || message) && <div className={actionError ? "toast-message error" : "toast-message"} role="status">{actionError || message}</div>}
    </main>
  );
}
