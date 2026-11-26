# Plan técnico

## Stack y estructura

- Frontend: React, TypeScript y Vite.
- Backend: Node.js, TypeScript y Express.
- Persistencia: PostgreSQL, migraciones SQL versionadas.
- Validación: Zod en los límites HTTP.
- Tests: Vitest y Supertest; lógica de dominio testeada con repositorios controlados.
- Estructura backend: routes/controllers, services de aplicación, repositories de persistencia y domain para reglas puras.
- El frontend no accede a la base de datos; consume la API REST.

## Estructura del proyecto

- Raíz: idea.md, spec.md, plan.md, tareas.md y AGENTS.md.
- docs/: decisiones.md, glosario.md y preguntas-abiertas.md.
- frontend/: aplicación React.
- backend/: API Express, carpetas controllers/services/repositories/domain, migraciones y tests.
- agents/: roles de trabajo para analista, arquitecto, backend, frontend, tester y revisor.

## Modelo de datos

- users: id UUID, name, email único normalizado, password_hash, role customer/admin, created_at.
- tracks: id pequeño (1/2), name; se inicializan por migración.
- reservations: id UUID, track_id, organizer_id, operating_date, starts_at, ends_at, join_policy (open/approval), status (confirmed/cancelled), created_at.
- reservation_participants: id UUID, reservation_id, party_id, display_name, added_by_user_id, created_at.
- join_requests: id UUID, reservation_id, requester_id, status (pending/approved/rejected/cancelled), created_at, decided_at.
- join_request_participants: id UUID, join_request_id, display_name.
- track_blocks: id UUID, track_id, starts_at, ends_at, reason, created_by_admin_id, created_at.

Restricciones: email único; pistas limitadas a 1 y 2; estados con CHECK; índices por fecha y pista; claves foráneas. Antes de insertar una reserva, una transacción serializa la asignación y comprueba sesiones y bloqueos superpuestos. La sesión/turno es la unidad de ocupación; un grupo añadido no crea otra ocupación.

## API propuesta

- POST /api/auth/register, POST /api/auth/login, GET /api/auth/me
- GET /api/availability?date=YYYY-MM-DD
- GET /api/sessions?from=...&to=...
- POST /api/sessions
- GET /api/sessions/:id
- PATCH /api/sessions/:id/join-policy
- POST /api/sessions/:id/join-requests
- GET /api/sessions/:id/join-requests
- POST /api/join-requests/:id/approve, POST /api/join-requests/:id/reject
- DELETE /api/join-requests/:id
- DELETE /api/sessions/:id
- GET /api/me/sessions
- GET /api/admin/blocks, POST /api/admin/blocks, DELETE /api/admin/blocks/:id
- GET /api/health

## Reglas y ubicación

- Calendario, horarios y día operativo: domain/schedule.
- Cálculo de intervalos y solapamientos: domain/availability.
- Validación de cupos y políticas de unión: services/session-service.
- Autenticación y permisos: middleware/auth y controllers.
- Restricciones y concurrencia: PostgreSQL repository y migraciones.
- Componentes de presentación y estados de pantalla: frontend.

## Manejo del tiempo

El API recibe fechas ISO y devuelve instantes con zona/desplazamiento más fecha operativa. La UI representa todo en America/Argentina/Buenos_Aires. El reloj se inyecta en servicios para hacer deterministas las pruebas. Los intervalos son semiabiertos [inicio, fin), para que una tanda que termina a las 14:00 no choque con otra que empieza a las 14:00.

## Despliegue

La aplicación se prepara para frontend estático, API Node y PostgreSQL gestionado. Los secretos y DATABASE_URL se configuran como variables del proveedor; no se suben a Git. Incluye health check, CORS por origen y migraciones al iniciar el despliegue. La publicación real requiere una cuenta/proyecto de hosting y una base configurada.
