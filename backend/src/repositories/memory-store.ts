import { randomUUID } from "node:crypto";
import { badRequest, conflict, notFound } from "../domain/errors.js";
import type {
  JoinPolicy,
  JoinRequest,
  NewJoinRequest,
  NewReservation,
  NewTrackBlock,
  Reservation,
  Store,
  TrackBlock,
  User
} from "../domain/types.js";

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return Date.parse(aStart) < Date.parse(bEnd) && Date.parse(bStart) < Date.parse(aEnd);
}

export class MemoryStore implements Store {
  private users: User[] = [];
  private reservations: Reservation[] = [];
  private requests: JoinRequest[] = [];
  private blocks: TrackBlock[] = [];
  private locks = new Map<string, Promise<void>>();

  private async withLock<T>(key: string, work: () => Promise<T> | T): Promise<T> {
    const previous = this.locks.get(key) ?? Promise.resolve();
    let release = () => {};
    const current = new Promise<void>((resolve) => { release = resolve; });
    this.locks.set(key, current);
    await previous;
    try {
      return await work();
    } finally {
      release();
      if (this.locks.get(key) === current) this.locks.delete(key);
    }
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.users.find((user) => user.email === email.toLowerCase()) ?? null;
  }

  async findUserById(id: string): Promise<User | null> {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async createUser(input: Omit<User, "id" | "createdAt">): Promise<User> {
    if (await this.findUserByEmail(input.email.toLowerCase())) {
      throw conflict("Ese correo ya está registrado.", "EMAIL_TAKEN");
    }
    const user: User = {
      ...input,
      email: input.email.toLowerCase(),
      id: randomUUID(),
      createdAt: new Date().toISOString()
    };
    this.users.push(user);
    return user;
  }

  async listReservations(from: string, to: string): Promise<Reservation[]> {
    return this.reservations
      .filter((reservation) => overlaps(reservation.startsAt, reservation.endsAt, from, to))
      .map((reservation) => structuredClone(reservation));
  }

  async getReservation(id: string): Promise<Reservation | null> {
    const reservation = this.reservations.find((item) => item.id === id);
    return reservation ? structuredClone(reservation) : null;
  }

  async listMyReservations(userId: string): Promise<Reservation[]> {
    return this.reservations
      .filter((reservation) =>
        reservation.organizerId === userId ||
        reservation.participants.some((participant) => participant.addedByUserId === userId)
      )
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .map((reservation) => structuredClone(reservation));
  }

  async createReservation(input: NewReservation): Promise<Reservation> {
    if (input.participantNames.length < 2 || input.participantNames.length > 8) {
      throw badRequest("Una tanda necesita entre 2 y 8 participantes.", "INVALID_PARTICIPANT_COUNT");
    }
    return this.withLock("operating-date:" + input.operatingDate, async () => {
      for (const trackId of [1, 2]) {
        const hasReservation = this.reservations.some((reservation) =>
          reservation.trackId === trackId &&
          reservation.status === "confirmed" &&
          overlaps(reservation.startsAt, reservation.endsAt, input.startsAt, input.endsAt)
        );
        const hasBlock = this.blocks.some((block) =>
          block.trackId === trackId && overlaps(block.startsAt, block.endsAt, input.startsAt, input.endsAt)
        );
        if (hasReservation || hasBlock) continue;

        const reservation: Reservation = {
          id: randomUUID(),
          trackId,
          organizerId: input.organizerId,
          operatingDate: input.operatingDate,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          joinPolicy: input.joinPolicy,
          status: "confirmed",
          participants: input.participantNames.map((name) => ({ name, addedByUserId: input.organizerId })),
          createdAt: new Date().toISOString()
        };
        this.reservations.push(reservation);
        return structuredClone(reservation);
      }
      throw conflict("Ese horario ya no tiene pistas libres.", "SLOT_FULL");
    });
  }

  async createJoinRequest(input: NewJoinRequest): Promise<JoinRequest> {
    if (input.participantNames.length < 1 || input.participantNames.length > 6) {
      throw badRequest("La solicitud debe incluir entre 1 y 6 participantes.", "INVALID_PARTICIPANT_COUNT");
    }
    return this.withLock("reservation:" + input.reservationId, async () => {
      const reservation = this.reservations.find((item) => item.id === input.reservationId);
      if (!reservation || reservation.status !== "confirmed") throw notFound("No encontramos un grupo activo para ese horario.");
      if (Date.parse(reservation.startsAt) <= Date.now()) throw conflict("La tanda ya comenzó.", "SESSION_STARTED");
      if (reservation.organizerId === input.requesterId) throw conflict("Ya sos anfitrión de este grupo.", "ALREADY_HOST");
      if (reservation.participants.some((participant) => participant.addedByUserId === input.requesterId)) {
        throw conflict("Ya formás parte de este grupo.", "ALREADY_MEMBER");
      }
      if (this.requests.some((request) =>
        request.reservationId === reservation.id &&
        request.requesterId === input.requesterId &&
        request.status === "pending"
      )) {
        throw conflict("Ya tenés una solicitud pendiente para este grupo.", "REQUEST_EXISTS");
      }

      const currentCount = reservation.participants.length;
      if (currentCount + input.participantNames.length > 8) {
        throw conflict("El grupo no tiene tantos lugares disponibles.", "CAPACITY_REACHED");
      }
      const request: JoinRequest = {
        id: randomUUID(),
        reservationId: reservation.id,
        requesterId: input.requesterId,
        status: reservation.joinPolicy === "open" ? "approved" : "pending",
        participantNames: [...input.participantNames],
        createdAt: new Date().toISOString(),
        decidedAt: reservation.joinPolicy === "open" ? new Date().toISOString() : null
      };
      this.requests.push(request);
      if (request.status === "approved") {
        reservation.participants.push(...input.participantNames.map((name) => ({
          name,
          addedByUserId: input.requesterId
        })));
      }
      return structuredClone(request);
    });
  }

  async listRequestsForOrganizer(userId: string): Promise<Array<JoinRequest & { reservation: Reservation }>> {
    return this.requests
      .filter((request) => request.status === "pending")
      .flatMap((request) => {
        const reservation = this.reservations.find((item) =>
          item.id === request.reservationId && item.organizerId === userId && item.status === "confirmed"
        );
        return reservation ? [{ ...structuredClone(request), reservation: structuredClone(reservation) }] : [];
      })
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async decideJoinRequest(id: string, organizerId: string, approve: boolean): Promise<JoinRequest> {
    const current = this.requests.find((request) => request.id === id);
    if (!current) throw notFound("No encontramos esa solicitud.");
    return this.withLock("reservation:" + current.reservationId, async () => {
      const request = this.requests.find((item) => item.id === id);
      const reservation = request && this.reservations.find((item) => item.id === request.reservationId);
      if (!request || !reservation) throw notFound("No encontramos esa solicitud.");
      if (reservation.organizerId !== organizerId) throw conflict("Solo el anfitrión puede responder esta solicitud.", "NOT_REQUEST_HOST");
      if (request.status !== "pending") throw conflict("La solicitud ya fue respondida.", "REQUEST_RESOLVED");
      if (Date.parse(reservation.startsAt) <= Date.now()) throw conflict("La tanda ya comenzó.", "SESSION_STARTED");

      if (approve) {
        if (reservation.participants.length + request.participantNames.length > 8) {
          throw conflict("No hay suficientes lugares para aprobar esta solicitud.", "CAPACITY_REACHED");
        }
        reservation.participants.push(...request.participantNames.map((name) => ({
          name,
          addedByUserId: request.requesterId
        })));
        request.status = "approved";
      } else {
        request.status = "rejected";
      }
      request.decidedAt = new Date().toISOString();
      return structuredClone(request);
    });
  }

  async cancelReservation(id: string, organizerId: string): Promise<void> {
    const reservation = this.reservations.find((item) => item.id === id);
    if (!reservation) throw notFound("No encontramos esa reserva.");
    await this.withLock("reservation:" + id, () => {
      if (reservation.organizerId !== organizerId) throw conflict("Solo el organizador puede cancelar la reserva.", "NOT_RESERVATION_OWNER");
      if (reservation.status !== "confirmed") throw conflict("La reserva ya está cancelada.", "ALREADY_CANCELLED");
      if (Date.parse(reservation.startsAt) <= Date.now()) throw conflict("La tanda ya comenzó.", "SESSION_STARTED");
      reservation.status = "cancelled";
      this.requests
        .filter((request) => request.reservationId === reservation.id && request.status === "pending")
        .forEach((request) => {
          request.status = "cancelled";
          request.decidedAt = new Date().toISOString();
        });
    });
  }

  async changeJoinPolicy(id: string, organizerId: string, policy: JoinPolicy): Promise<Reservation> {
    const reservation = this.reservations.find((item) => item.id === id);
    if (!reservation) throw notFound("No encontramos esa reserva.");
    return this.withLock("reservation:" + id, () => {
      if (reservation.organizerId !== organizerId) throw conflict("Solo el organizador puede cambiar esta opción.", "NOT_RESERVATION_OWNER");
      if (reservation.status !== "confirmed" || Date.parse(reservation.startsAt) <= Date.now()) {
        throw conflict("La opción de incorporación solo cambia antes de la tanda.", "SESSION_STARTED");
      }
      reservation.joinPolicy = policy;
      return structuredClone(reservation);
    });
  }

  async listBlocks(from?: string, to?: string): Promise<TrackBlock[]> {
    return this.blocks
      .filter((block) => (!from || block.endsAt > from) && (!to || block.startsAt < to))
      .map((block) => structuredClone(block));
  }

  async createBlock(input: NewTrackBlock): Promise<TrackBlock> {
    return this.withLock("operating-date:" + input.operatingDate, () => {
      if (this.reservations.some((reservation) =>
        reservation.trackId === input.trackId &&
        reservation.status === "confirmed" &&
        overlaps(reservation.startsAt, reservation.endsAt, input.startsAt, input.endsAt)
      )) {
        throw conflict("No se puede bloquear una pista que tiene una tanda confirmada.", "TRACK_IN_USE");
      }
      if (this.blocks.some((block) =>
        block.trackId === input.trackId && overlaps(block.startsAt, block.endsAt, input.startsAt, input.endsAt)
      )) {
        throw conflict("Ese intervalo ya está bloqueado.", "BLOCK_OVERLAP");
      }
      const block: TrackBlock = {
        ...input,
        id: randomUUID(),
        createdAt: new Date().toISOString()
      };
      this.blocks.push(block);
      return structuredClone(block);
    });
  }

  async deleteBlock(id: string): Promise<void> {
    const index = this.blocks.findIndex((block) => block.id === id);
    if (index < 0) throw notFound("No encontramos ese bloqueo.");
    this.blocks.splice(index, 1);
  }

  async close(): Promise<void> {}
}
