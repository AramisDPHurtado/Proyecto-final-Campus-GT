import { useState, type ReactNode } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ArrowDownRight, ArrowRight, CalendarDays, Check, Clock3, Flag, Menu, ShieldCheck, Users, X } from "lucide-react";
import { useAuth } from "./auth";
import { BookingPage } from "./pages/booking-page";
import { MySessionsPage } from "./pages/my-sessions-page";
import { AdminPage } from "./pages/admin-page";
import { AuthPage } from "./pages/auth-page";

function Header() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="nav-wrap">
        <Link className="brand" to="/" aria-label="Karting Campus GT, inicio">
            <span className="brand-mark"><Flag size={18} strokeWidth={2.6} /></span>
          <span><strong>KARTING</strong><small>CAMPUS GT</small></span>
        </Link>
        <button className="mobile-menu" onClick={() => setMenuOpen((value) => !value)} aria-label="Abrir navegación">
          {menuOpen ? <X /> : <Menu />}
        </button>
        <nav className={menuOpen ? "main-nav is-open" : "main-nav"}>
          <Link to="/reservar" onClick={() => setMenuOpen(false)}>Reservar</Link>
          {user && <Link to="/mis-tandas" onClick={() => setMenuOpen(false)}>Mis tandas</Link>}
          {user?.role === "admin" && <Link to="/admin" onClick={() => setMenuOpen(false)}>Administración</Link>}
          {user ? (
            <div className="nav-user">
              <span className="user-initial">{user.name.charAt(0).toUpperCase()}</span>
              <span className="nav-user-name">{user.name.split(" ")[0]}</span>
              <button className="text-button" onClick={logout}>Salir</button>
            </div>
          ) : (
            <Link className="nav-login" to="/ingresar">Ingresar</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

function HomePage() {
  return (
    <>
      <section className="hero-section">
        <div className="hero-grid">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> DOS PISTAS. TU PRÓXIMA HISTORIA.</div>
            <h1>La pista está<br /><span>esperando.</span></h1>
            <p className="hero-description">Elegí una tanda, armá tu grupo y salí a correr. Si quedan lugares, podés abrirlo para que se sume más gente.</p>
            <div className="hero-actions">
              <Link className="button button-lime" to="/reservar">Buscar una tanda <ArrowRight size={17} /></Link>
              <a className="quiet-link" href="#como-funciona">Cómo funciona <ArrowDownRight size={16} /></a>
            </div>
            <div className="hero-facts">
              <div><Clock3 size={16} /><span>Turnos de 60 min</span></div>
              <div><Users size={16} /><span>Grupos de 2 a 8</span></div>
            </div>
          </div>
          <div className="track-visual" aria-label="Ilustración de dos pistas de karting">
            <div className="track-topline"><span>TRACK MAP</span><span>01 / 02</span></div>
            <svg viewBox="0 0 560 420" role="img" aria-hidden="true">
              <defs>
                <pattern id="grid" width="22" height="22" patternUnits="userSpaceOnUse">
                  <path d="M 22 0 L 0 0 0 22" fill="none" stroke="rgba(255,255,255,.035)" strokeWidth="1" />
                </pattern>
                <linearGradient id="trackGlow" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#d6ff36" />
                  <stop offset="1" stopColor="#83bc21" />
                </linearGradient>
              </defs>
              <rect width="560" height="420" fill="url(#grid)" />
              <path d="M 83 295 C 51 245 80 176 131 166 C 188 154 205 203 253 204 C 295 206 314 156 355 144 C 415 127 476 163 478 221 C 480 276 441 310 388 300 C 333 290 325 247 276 250 C 224 253 203 315 145 319 C 117 321 96 311 83 295 Z" fill="none" stroke="#28333a" strokeWidth="58" strokeLinecap="round" />
              <path d="M 83 295 C 51 245 80 176 131 166 C 188 154 205 203 253 204 C 295 206 314 156 355 144 C 415 127 476 163 478 221 C 480 276 441 310 388 300 C 333 290 325 247 276 250 C 224 253 203 315 145 319 C 117 321 96 311 83 295 Z" fill="none" stroke="url(#trackGlow)" strokeWidth="4" strokeDasharray="2 13" strokeLinecap="round" />
              <path d="M 77 260 L 94 249 M 91 283 L 109 272 M 105 303 L 123 292 M 433 162 L 448 175 M 449 181 L 463 196" stroke="#e6eced" strokeWidth="5" strokeLinecap="round" opacity=".8" />
              <circle cx="132" cy="167" r="13" fill="#f57643" />
              <circle cx="132" cy="167" r="4" fill="#fff" />
              <circle cx="388" cy="300" r="13" fill="#d6ff36" />
              <circle cx="388" cy="300" r="4" fill="#111" />
              <g transform="translate(245 187) rotate(18)">
                <rect x="-20" y="-12" width="40" height="24" rx="8" fill="#f57643" />
                <circle cx="-10" cy="-13" r="5" fill="#11181d" /><circle cx="11" cy="-13" r="5" fill="#11181d" />
                <circle cx="-10" cy="13" r="5" fill="#11181d" /><circle cx="11" cy="13" r="5" fill="#11181d" />
                <circle cx="1" cy="0" r="6" fill="#f7f4e9" />
              </g>
              <g transform="translate(412 240) rotate(80)">
                <rect x="-17" y="-10" width="34" height="20" rx="7" fill="#d6ff36" />
                <circle cx="-9" cy="-12" r="4" fill="#11181d" /><circle cx="9" cy="-12" r="4" fill="#11181d" />
                <circle cx="-9" cy="12" r="4" fill="#11181d" /><circle cx="9" cy="12" r="4" fill="#11181d" />
              </g>
            </svg>
            <div className="track-label label-a"><span>01</span> Curva Norte</div>
            <div className="track-label label-b"><span>02</span> Curva Sur</div>
            <div className="track-caption"><span className="live-dot" /> PISTAS EN PARALELO <span>·</span> CUPO LIMITADO</div>
          </div>
        </div>
        <div className="hero-bottom">
          <span>VUELTAS QUE SE CUENTAN.</span>
          <span>01 — 02 <span className="lime-text">/</span> CAMPUS GT</span>
        </div>
      </section>

      <section className="how-section section-wrap" id="como-funciona">
        <div className="section-intro">
          <span className="section-kicker">EN TRES PASOS</span>
          <h2>Vos ponés el grupo.<br /><span>Nosotros, la pista.</span></h2>
        </div>
        <div className="step-grid">
          <article className="step-card">
            <span className="step-number">01</span><CalendarDays />
            <h3>Elegí cuándo</h3>
            <p>Buscá una hora disponible entre martes y domingo. Cada tanda dura una hora.</p>
          </article>
          <article className="step-card">
            <span className="step-number">02</span><Users />
            <h3>Armá tu grupo</h3>
            <p>Reservá con al menos una persona más. El kart y el casco ya están acá.</p>
          </article>
          <article className="step-card">
            <span className="step-number">03</span><ShieldCheck />
            <h3>Compartí, si querés</h3>
            <p>Dejá el grupo abierto para sumar gente o aprobá cada solicitud que llegue.</p>
          </article>
        </div>
      </section>

      <section className="cta-band">
        <div><span className="section-kicker">TU PRÓXIMA TANDA</span><h2>El mejor plan empieza<br />en la primera curva.</h2></div>
        <Link className="button button-dark" to="/reservar">Ver disponibilidad <ArrowRight size={17} /></Link>
        <div className="cta-mark">GT</div>
      </section>
      <footer className="site-footer"><span>KARTING CAMPUS GT</span><span>Dos pistas. Una hora. A correr.</span><span>PROYECTO FINAL · CAMPUS GT</span></footer>
    </>
  );
}

function Protected({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <main className="page-loading">Cargando tu sesión…</main>;
  if (!user) return <Navigate to="/ingresar" state={{ from: location.pathname }} replace />;
  if (admin && user.role !== "admin") return <main className="page-loading">Esta sección es solo para administración.</main>;
  return <>{children}</>;
}

export function App() {
  return (
    <div className="app-shell">
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/reservar" element={<BookingPage />} />
        <Route path="/ingresar" element={<AuthPage />} />
        <Route path="/mis-tandas" element={<Protected><MySessionsPage /></Protected>} />
        <Route path="/admin" element={<Protected admin><AdminPage /></Protected>} />
        <Route path="*" element={<main className="page-loading">No encontramos esta página. <Link to="/">Volver al inicio</Link></main>} />
      </Routes>
    </div>
  );
}
