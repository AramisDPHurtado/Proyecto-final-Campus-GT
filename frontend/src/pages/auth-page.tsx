import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Flag, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useAuth } from "../auth";

export function AuthPage() {
  const { user, login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const destination = (location.state as { from?: string } | null)?.from ?? "/reservar";
  if (user) return <Navigate to={destination} replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "register") await register(name, email, password);
      else await login(email, password);
      navigate(destination, { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo completar el ingreso.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="back-link" to="/"><ArrowLeft size={16} /> Volver al inicio</Link>
        <div className="auth-emblem"><Flag size={22} /></div>
        <span className="section-kicker">KARTING CAMPUS GT</span>
        <h1>{mode === "login" ? "Volvé a la pista." : "Arrancá por acá."}</h1>
        <p className="auth-subtitle">{mode === "login" ? "Ingresá para administrar tus tandas y grupos." : "Creá tu cuenta para reservar o sumarte a un grupo."}</p>
        <div className="auth-tabs" role="tablist" aria-label="Tipo de acceso">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")} type="button">Ingresar</button>
          <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")} type="button">Crear cuenta</button>
        </div>
        <form className="form-stack" onSubmit={submit}>
          {mode === "register" && (
            <label className="field-label">
              Nombre
              <span className="input-wrap"><UserRound size={17} /><input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={80} /></span>
            </label>
          )}
          <label className="field-label">
            Correo electrónico
            <span className="input-wrap"><Mail size={17} /><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></span>
          </label>
          <label className="field-label">
            Contraseña
            <span className="input-wrap"><LockKeyhole size={17} /><input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={mode === "register" ? 8 : 1} /></span>
            {mode === "register" && <small>Mínimo 8 caracteres.</small>}
          </label>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="button button-lime full-width" disabled={busy} type="submit">
            {busy ? "Un segundo…" : mode === "login" ? "Ingresar" : "Crear cuenta"} {!busy && <ArrowRight size={17} />}
          </button>
        </form>
        <div className="auth-note">Tu información se usa para gestionar reservas y solicitudes de grupo.</div>
      </section>
      <aside className="auth-aside">
        <div className="auth-aside-top">BOX <span>02</span></div>
        <div><span className="section-kicker">DOS PISTAS DISPONIBLES</span><p>El próximo grupo<br />puede ser el tuyo.</p></div>
        <div className="auth-aside-bottom"><span>60 MIN</span><span>2 — 8 PILOTOS</span></div>
      </aside>
    </main>
  );
}
