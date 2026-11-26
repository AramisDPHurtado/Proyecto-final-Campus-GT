import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Check, Clock3, LockKeyhole, RotateCw, Users, X } from "lucide-react";
import { useAuth } from "../auth";
import { api, jsonBody, type PublicSession } from "../api";

interface IncomingRequest {
  id: string;
  reservationId: string;
  requesterId: string;
  participantNames: string[];
  createdAt: string;
  sessionStartsAt: string;
}

function formatSession(value: string) {
  const date = new Date(value);
  return {
    date: new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" }).format(date),
    time: new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" }).format(date)
  };
}

export function MySessionsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<PublicSession[]>([]);
  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");

  const refresh = useCallback(async () => {
    const result = await api<{ sessions: PublicSession[]; incomingRequests: IncomingRequest[] }>("/api/me/sessions");
    setSessions(result.sessions);
    setRequests(result.incomingRequests);
  }, []);

  useEffect(() => {
    refresh().catch((caught) => setError(caught instanceof Error ? caught.message : "No se pudieron cargar tus tandas."))
      .finally(() => setLoading(false));
  }, [refresh]);

  async function respond(request: IncomingRequest, approve: boolean) {
    setBusyId(request.id);
    setError("");
    setNotice("");
    try {
      await api("/api/join-requests/" + request.id + (approve ? "/approve" : "/reject"), { method: "POST" });
      setNotice(approve ? "Solicitud aprobada. El grupo quedó actualizado." : "Solicitud rechazada.");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo responder la solicitud.");
    } finally {
      setBusyId("");
    }
  }

  async function cancel(session: PublicSession) {
    if (!window.confirm("¿Querés cancelar esta tanda? La pista volverá a estar disponible.")) return;
    setBusyId(session.id);
    setError("");
    setNotice("");
    try {
      await api("/api/sessions/" + session.id, { method: "DELETE" });
      setNotice("Tanda cancelada; la pista quedó libre.");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo cancelar la tanda.");
    } finally {
      setBusyId("");
    }
  }

  async function changePolicy(session: PublicSession) {
    const next = session.joinPolicy === "open" ? "approval" : "open";
    setBusyId(session.id);
    setError("");
    try {
      await api("/api/sessions/" + session.id + "/join-policy", {
        method: "PATCH",
        body: jsonBody({ joinPolicy: next })
      });
      setNotice(next === "open" ? "El grupo ahora acepta incorporaciones automáticamente." : "Las nuevas incorporaciones requieren tu aprobación.");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo cambiar la política del grupo.");
    } finally {
      setBusyId("");
    }
  }

  const owned = sessions.filter((session) => session.organizerId === user?.id);
  const joined = sessions.filter((session) => session.organizerId !== user?.id);

  return (
    <main className="dashboard-page">
      <div className="page-heading">
        <div><span className="section-kicker">TU CUENTA · PISTA DOBLE</span><h1>Mis tandas<span className="lime-text">.</span></h1><p>Hola, {user?.name.split(" ")[0]}. Acá tenés tus grupos y solicitudes.</p></div>
        <Link className="button button-lime" to="/reservar">Nueva tanda <ArrowRight size={17} /></Link>
      </div>

      {error && <div className="notice error-state" role="alert">{error}<button onClick={() => void refresh()}><RotateCw size={15} /> Reintentar</button></div>}
      {notice && <div className="notice success-state" role="status"><Check size={16} /> {notice}</div>}
      {loading && <div className="state-card"><span className="spinner" /> Cargando tus tandas…</div>}

      {!loading && requests.length > 0 && (
        <section className="dashboard-section">
          <div className="section-title-line"><div><span className="section-kicker">PENDIENTES DE RESPUESTA</span><h2>Solicitudes para tu grupo</h2></div><span className="count-pill">{requests.length}</span></div>
          <div className="request-grid">
            {requests.map((request) => {
              const when = formatSession(request.sessionStartsAt);
              return (
                <article className="request-card" key={request.id}>
                  <div className="request-date"><CalendarDays size={16} /> {when.date} · {when.time}</div>
                  <h3>{request.participantNames.join(", ")}</h3>
                  <p>Quieren sumarse a tu grupo en la Pista Doble.</p>
                  <div className="request-actions">
                    <button className="button button-lime small-button" disabled={busyId === request.id} onClick={() => void respond(request, true)}><Check size={15} /> Aprobar</button>
                    <button className="button button-quiet small-button" disabled={busyId === request.id} onClick={() => void respond(request, false)}><X size={15} /> Rechazar</button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {!loading && (
        <>
          <section className="dashboard-section">
            <div className="section-title-line"><div><span className="section-kicker">RESERVAS CREADAS POR VOS</span><h2>Mis grupos</h2></div><span className="count-pill">{owned.length}</span></div>
            {owned.length === 0 ? <div className="empty-dashboard"><Users /><strong>Todavía no tenés tandas propias.</strong><span>Armá un grupo y elegí si querés dejarlo abierto.</span><Link to="/reservar">Buscar horarios disponibles <ArrowRight size={15} /></Link></div> : (
              <div className="session-grid">
                {owned.map((session) => {
                  const when = formatSession(session.startsAt);
                  const past = Date.parse(session.startsAt) <= Date.now();
                  return (
                    <article className={"session-card" + (session.status === "cancelled" ? " is-cancelled" : "")} key={session.id}>
                      <div className="session-card-top"><span className="session-time"><Clock3 size={15} /> {when.time}</span><span className="track-number">PISTA 0{session.trackId}</span></div>
                      <h3>{when.date}</h3>
                      <div className="session-meta"><Users size={15} /> {session.participantCount} / 8 pilotos <span>·</span> {session.status === "confirmed" ? "Confirmada" : "Cancelada"}</div>
                      <div className="member-chips">{session.participants.map((person, index) => <span key={index}>{person}</span>)}</div>
                      <div className="session-policy-row"><span className={session.joinPolicy === "open" ? "policy-tag open" : "policy-tag"}>{session.joinPolicy === "open" ? "Abierto" : "Con aprobación"}</span>{!past && session.status === "confirmed" && <button className="link-button" onClick={() => void changePolicy(session)} disabled={busyId === session.id}>{session.joinPolicy === "open" ? "Cambiar a aprobación" : "Abrir el grupo"}</button>}</div>
                      {!past && session.status === "confirmed" && <button className="cancel-link" onClick={() => void cancel(session)} disabled={busyId === session.id}><X size={14} /> Cancelar tanda</button>}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
          {joined.length > 0 && <section className="dashboard-section">
            <div className="section-title-line"><div><span className="section-kicker">LUGARES A LOS QUE TE SUMASTE</span><h2>Otros grupos</h2></div><span className="count-pill">{joined.length}</span></div>
            <div className="session-grid">
              {joined.map((session) => {
                const when = formatSession(session.startsAt);
                return <article className="session-card" key={session.id}><div className="session-card-top"><span className="session-time"><Clock3 size={15} /> {when.time}</span><span className="track-number">PISTA 0{session.trackId}</span></div><h3>{when.date}</h3><div className="session-meta"><Users size={15} /> {session.participantCount} / 8 pilotos</div><p className="joined-note"><LockKeyhole size={14} /> Turno con grupo anfitrión</p></article>;
              })}
            </div>
          </section>}
        </>
      )}
    </main>
  );
}
