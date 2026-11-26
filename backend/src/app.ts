import "dotenv/config";
import bcrypt from "bcryptjs";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import { DateTime } from "luxon";
import { z } from "zod";
import { AppError, badRequest, forbidden, notFound, unauthorized } from "./domain/errors.js";
import { BUSINESS_ZONE, slotsForDate, validateFutureBusinessSlot } from "./domain/schedule.js";
import type { AuthUser, JoinPolicy, Store } from "./domain/types.js";

const registrationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8).max(100)
});

const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(100)
});

const reservationSchema = z.object({
  startsAt: z.string().min(1),
  guestNames: z.array(z.string().trim().min(2).max(80)).min(1).max(7),
  joinPolicy: z.enum(["open", "approval"])
});

const joinSchema = z.object({
  guestNames: z.array(z.string().trim().min(2).max(80)).max(5).default([])
});

const policySchema = z.object({ joinPolicy: z.enum(["open", "approval"]) });
const blockSchema = z.object({
  trackId: z.coerce.number().int().min(1).max(2),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  reason: z.string().trim().min(3).max(120)
});

interface RequestWithUser extends Request {
  user?: AuthUser;
}

function currentUser(req: Request): AuthUser {
  const user = (req as RequestWithUser).user;
  if (!user) throw unauthorized();
  return user;
}

function parameterId(req: Request): string {
  return z.string().min(1).parse(req.params.id);
}

function issueToken(user: AuthUser, secret: string): string {
  return jwt.sign(user, secret, { expiresIn: "8h", issuer: "karting-campus-gt" });
}

function toPublicReservation(reservation: Awaited<ReturnType<Store["getReservation"]>>) {
  if (!reservation) return null;
  return {
    id: reservation.id,
    trackId: reservation.trackId,
    organizerId: reservation.organizerId,
    operatingDate: reservation.operatingDate,
    startsAt: reservation.startsAt,
    endsAt: reservation.endsAt,
    joinPolicy: reservation.joinPolicy,
    status: reservation.status,
    participantCount: reservation.participants.length,
    participants: reservation.participants.map((participant) => participant.name),
    createdAt: reservation.createdAt
  };
}

export interface AppOptions {
  store: Store;
  jwtSecret?: string;
  now?: () => DateTime;
}

export function createApp({ store, jwtSecret = process.env.JWT_SECRET, now = () => DateTime.now().setZone(BUSINESS_ZONE) }: AppOptions) {
  if (!jwtSecret || jwtSecret.length < 24) {
    throw new Error("JWT_SECRET debe tener al menos 24 caracteres.");
  }
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({
    origin: process.env.FRONTEND_ORIGIN?.split(",").map((origin) => origin.trim()) ?? ["http://localhost:5173"],
    credentials: true
  }));
  app.use(express.json({ limit: "100kb" }));

  const authenticate = (req: Request, _res: Response, next: NextFunction) => {
    try {
      const header = req.header("authorization");
      if (!header?.startsWith("Bearer ")) throw unauthorized();
      const token = header.slice("Bearer ".length);
      const payload = jwt.verify(token, jwtSecret, { issuer: "karting-campus-gt" }) as AuthUser;
      (req as RequestWithUser).user = { id: payload.id, name: payload.name, email: payload.email, role: payload.role };
      next();
    } catch (error) {
      next(error instanceof AppError ? error : unauthorized("La sesión venció. Volvé a iniciar sesión."));
    }
  };

  const requireAdmin = (req: Request, _res: Response, next: NextFunction) => {
    if ((req as RequestWithUser).user?.role !== "admin") return next(forbidden());
    next();
  };

  app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "karting-campus-gt" }));

  app.post("/api/auth/register", async (req, res) => {
    const input = registrationSchema.parse(req.body);
    const user = await store.createUser({
      name: input.name,
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, 12),
      role: "customer"
    });
    const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role };
    res.status(201).json({ user: safeUser, token: issueToken(safeUser, jwtSecret) });
  });

  app.post("/api/auth/login", async (req, res) => {
    const input = loginSchema.parse(req.body);
    const user = await store.findUserByEmail(input.email);
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw unauthorized("El correo o la contraseña no coinciden.");
    }
    const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role };
    res.json({ user: safeUser, token: issueToken(safeUser, jwtSecret) });
  });

  app.get("/api/auth/me", authenticate, async (req, res) => {
    const user = currentUser(req);
    const record = await store.findUserById(user.id);
    if (!record) throw unauthorized();
    res.json({ user: { id: record.id, name: record.name, email: record.email, role: record.role } });
  });

  app.get("/api/availability", async (req, res) => {
    const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(req.query.date);
    const slots = slotsForDate(date, now());
    if (slots.length === 0) {
      res.json({ date, timezone: BUSINESS_ZONE, slots: [] });
      return;
    }
    const first = DateTime.fromISO(date, { zone: BUSINESS_ZONE }).startOf("day");
    const reservations = await store.listReservations(first.toUTC().toISO() ?? "", first.plus({ days: 1 }).toUTC().toISO() ?? "");
    const blocks = await store.listBlocks(first.toUTC().toISO() ?? "", first.plus({ days: 1 }).toUTC().toISO() ?? "");
    const activeReservations = reservations.filter((item) => item.status === "confirmed");
    const result = slots.map((slot) => {
      const sessions = activeReservations
        .filter((item) => item.startsAt === slot.startsAt)
        .map((item) => ({
          id: item.id,
          trackId: item.trackId,
          participantCount: item.participants.length,
          placesLeft: Math.max(0, 8 - item.participants.length),
          joinPolicy: item.joinPolicy
        }));
      const busyTracks = new Set(sessions.map((session) => session.trackId));
      for (const block of blocks) {
        if (Date.parse(block.startsAt) < Date.parse(slot.endsAt) && Date.parse(slot.startsAt) < Date.parse(block.endsAt)) {
          busyTracks.add(block.trackId);
        }
      }
      return {
        ...slot,
        canCreate: busyTracks.size < 2,
        availableTracks: Math.max(0, 2 - busyTracks.size),
        sessions
      };
    });
    res.json({ date, timezone: BUSINESS_ZONE, slots: result });
  });

  app.get("/api/sessions/:id", async (req, res) => {
    const reservation = await store.getReservation(parameterId(req));
    if (!reservation || reservation.status !== "confirmed") throw notFound("No encontramos una tanda activa.");
    res.json({ session: toPublicReservation(reservation) });
  });

  app.post("/api/sessions", authenticate, async (req, res) => {
    const user = currentUser(req);
    const input = reservationSchema.parse(req.body);
    const slot = validateFutureBusinessSlot(input.startsAt, now());
    const reservation = await store.createReservation({
      organizerId: user.id,
      operatingDate: slot.operatingDate,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      joinPolicy: input.joinPolicy as JoinPolicy,
      participantNames: [user.name, ...input.guestNames]
    });
    res.status(201).json({ session: toPublicReservation(reservation) });
  });

  app.get("/api/me/sessions", authenticate, async (req, res) => {
    const user = currentUser(req);
    const sessions = await store.listMyReservations(user.id);
    const requests = await store.listRequestsForOrganizer(user.id);
    res.json({
      sessions: sessions.map((item) => toPublicReservation(item)),
      incomingRequests: requests.map((item) => ({
        id: item.id,
        reservationId: item.reservationId,
        requesterId: item.requesterId,
        participantNames: item.participantNames,
        createdAt: item.createdAt,
        sessionStartsAt: item.reservation.startsAt
      }))
    });
  });

  app.post("/api/sessions/:id/join-requests", authenticate, async (req, res) => {
    const user = currentUser(req);
    const input = joinSchema.parse(req.body);
    const request = await store.createJoinRequest({
      reservationId: parameterId(req),
      requesterId: user.id,
      participantNames: [user.name, ...input.guestNames]
    });
    res.status(request.status === "approved" ? 200 : 202).json({
      request: {
        id: request.id,
        reservationId: request.reservationId,
        status: request.status,
        participantNames: request.participantNames
      }
    });
  });

  app.post("/api/join-requests/:id/approve", authenticate, async (req, res) => {
    const user = currentUser(req);
    const request = await store.decideJoinRequest(parameterId(req), user.id, true);
    res.json({ request: { id: request.id, status: request.status } });
  });

  app.post("/api/join-requests/:id/reject", authenticate, async (req, res) => {
    const user = currentUser(req);
    const request = await store.decideJoinRequest(parameterId(req), user.id, false);
    res.json({ request: { id: request.id, status: request.status } });
  });

  app.delete("/api/sessions/:id", authenticate, async (req, res) => {
    await store.cancelReservation(parameterId(req), currentUser(req).id);
    res.status(204).end();
  });

  app.patch("/api/sessions/:id/join-policy", authenticate, async (req, res) => {
    const user = currentUser(req);
    const { joinPolicy } = policySchema.parse(req.body);
    const reservation = await store.changeJoinPolicy(parameterId(req), user.id, joinPolicy);
    res.json({ session: toPublicReservation(reservation) });
  });

  app.get("/api/admin/blocks", authenticate, requireAdmin, async (_req, res) => {
    const blocks = await store.listBlocks();
    res.json({ blocks });
  });

  app.post("/api/admin/blocks", authenticate, requireAdmin, async (req, res) => {
    const user = currentUser(req);
    const input = blockSchema.parse(req.body);
    const start = validateFutureBusinessSlot(input.startsAt, now());
    const startsAt = DateTime.fromISO(start.startsAt).setZone(BUSINESS_ZONE);
    const endsAt = DateTime.fromISO(input.endsAt, { setZone: true }).setZone(BUSINESS_ZONE);
    if (!endsAt.isValid || endsAt.minute !== 0 || endsAt.toMillis() <= startsAt.toMillis()) {
      throw badRequest("El bloqueo debe terminar después de empezar y en una hora en punto.", "INVALID_BLOCK");
    }
    const hours = endsAt.diff(startsAt, "hours").hours;
    if (!Number.isInteger(hours) || hours > 12) throw badRequest("El bloqueo puede durar de 1 a 12 horas.", "INVALID_BLOCK");
    for (let offset = 0; offset < hours; offset += 1) {
      const cursor = startsAt.plus({ hours: offset });
      validateFutureBusinessSlot(cursor.toUTC().toISO() ?? "", now());
    }
    const block = await store.createBlock({
      trackId: input.trackId,
      startsAt: start.startsAt,
      endsAt: endsAt.toUTC().toISO() ?? "",
      reason: input.reason,
      createdByAdminId: user.id,
      operatingDate: start.operatingDate
    });
    res.status(201).json({ block });
  });

  app.delete("/api/admin/blocks/:id", authenticate, requireAdmin, async (req, res) => {
    await store.deleteBlock(parameterId(req));
    res.status(204).end();
  });

  app.use((_req, _res, next) => next(notFound("No encontramos esa ruta.")));
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Revisá los datos marcados.",
          details: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))
        }
      });
      return;
    }
    if (error instanceof AppError) {
      res.status(error.status).json({ error: { code: error.code, message: error.message } });
      return;
    }
    console.error("Error inesperado de API.", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Ocurrió un error. Probá de nuevo." } });
  });

  return app;
}
