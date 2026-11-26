import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
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

type Row = Record<string, unknown>;

function text(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function userFrom(row: Row): User {
  return {
    id: text(row.id),
    name: text(row.name),
    email: text(row.email),
    passwordHash: text(row.password_hash),
    role: row.role as User["role"],
    createdAt: text(row.created_at)
  };
}

function blockFrom(row: Row): TrackBlock {
  return {
    id: text(row.id),
    trackId: Number(row.track_id),
    startsAt: text(row.starts_at),
    endsAt: text(row.ends_at),
    reason: text(row.reason),
    createdByAdminId: text(row.created_by_admin_id),
    createdAt: text(row.created_at)
  };
}

function requestFrom(row: Row): JoinRequest {
  const names = typeof row.participant_names === "string"
    ? JSON.parse(row.participant_names) as string[]
    : row.participant_names as string[];
  return {
    id: text(row.id),
    reservationId: text(row.reservation_id),
    requesterId: text(row.requester_id),
    status: row.status as JoinRequest["status"],
    participantNames: names,
    createdAt: text(row.created_at),
    decidedAt: row.decided_at ? text(row.decided_at) : null
  };
}

export class PostgresStore implements Store {
  constructor(private readonly pool: Pool) {}

  async findUserByEmail(email: string): Promise<User | null> {
    const result = await this.pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
    return result.rows[0] ? userFrom(result.rows[0]) : null;
  }

  async findUserById(id: string): Promise<User | null> {
    const result = await this.pool.query("SELECT * FROM users WHERE id = $1", [id]);
    return result.rows[0] ? userFrom(result.rows[0]) : null;
  }

  async createUser(input: Omit<User, "id" | "createdAt">): Promise<User> {
    try {
      const result = await this.pool.query(
        "INSERT INTO users (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [randomUUID(), input.name, input.email.toLowerCase(), input.passwordHash, input.role]
      );
      return userFrom(result.rows[0]);
    } catch (error) {
      if ((error as { code?: string }).code === "23505") throw conflict("Ese correo ya está registrado.", "EMAIL_TAKEN");
      throw error;
    }
  }

  private async loadReservations(query: string, values: unknown[], client: Pool | PoolClient = this.pool): Promise<Reservation[]> {
    const result = await client.query(query, values);
    const reservations: Reservation[] = result.rows.map((row: Row) => ({
      id: text(row.id),
      trackId: Number(row.track_id),
      organizerId: text(row.organizer_id),
      operatingDate: text(row.operating_date).slice(0, 10),
      startsAt: text(row.starts_at),
      endsAt: text(row.ends_at),
      joinPolicy: row.join_policy as JoinPolicy,
      status: row.status as Reservation["status"],
      participants: [],
      createdAt: text(row.created_at)
    }));
    if (reservations.length === 0) return reservations;
    const ids = reservations.map((item) => item.id);
    const people = await client.query(
      "SELECT reservation_id, display_name, added_by_user_id FROM reservation_participants WHERE reservation_id = ANY($1::uuid[]) ORDER BY created_at",
      [ids]
    );
    const byId = new Map(reservations.map((item) => [item.id, item]));
    for (const row of people.rows as Row[]) {
      byId.get(text(row.reservation_id))?.participants.push({
        name: text(row.display_name),
        addedByUserId: text(row.added_by_user_id)
      });
    }
    return reservations;
  }

  async listReservations(from: string, to: string): Promise<Reservation[]> {
    return this.loadReservations(
      "SELECT * FROM reservations WHERE starts_at < $2 AND ends_at > $1 ORDER BY starts_at, track_id",
      [from, to]
    );
  }

  async getReservation(id: string): Promise<Reservation | null> {
    const rows = await this.loadReservations("SELECT * FROM reservations WHERE id = $1", [id]);
    return rows[0] ?? null;
  }

  async listMyReservations(userId: string): Promise<Reservation[]> {
    return this.loadReservations(
      "SELECT DISTINCT r.* FROM reservations r LEFT JOIN reservation_participants p ON p.reservation_id = r.id WHERE r.organizer_id = $1 OR p.added_by_user_id = $1 ORDER BY r.starts_at",
      [userId]
    );
  }

  async createReservation(input: NewReservation): Promise<Reservation> {
    if (input.participantNames.length < 2 || input.participantNames.length > 8) {
      throw badRequest("Una tanda necesita entre 2 y 8 participantes.", "INVALID_PARTICIPANT_COUNT");
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["karting:" + input.operatingDate]);
      const freeTrack = await client.query(
        [
          "SELECT t.id FROM tracks t",
          "WHERE NOT EXISTS (",
          " SELECT 1 FROM reservations r",
          " WHERE r.track_id = t.id AND r.status = 'confirmed'",
          " AND tstzrange(r.starts_at, r.ends_at, '[)') && tstzrange($1::timestamptz, $2::timestamptz, '[)')",
          ") AND NOT EXISTS (",
          " SELECT 1 FROM track_blocks b",
          " WHERE b.track_id = t.id",
          " AND tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange($1::timestamptz, $2::timestamptz, '[)')",
          ") ORDER BY t.id LIMIT 1"
        ].join(" "),
        [input.startsAt, input.endsAt]
      );
      if (!freeTrack.rows[0]) throw conflict("Ese horario ya no tiene pistas libres.", "SLOT_FULL");
      const id = randomUUID();
      await client.query(
        "INSERT INTO reservations (id, track_id, organizer_id, operating_date, starts_at, ends_at, join_policy, status) VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed')",
        [id, freeTrack.rows[0].id, input.organizerId, input.operatingDate, input.startsAt, input.endsAt, input.joinPolicy]
      );
      for (const name of input.participantNames) {
        await client.query(
          "INSERT INTO reservation_participants (id, reservation_id, display_name, added_by_user_id) VALUES ($1, $2, $3, $4)",
          [randomUUID(), id, name, input.organizerId]
        );
      }
      const rows = await this.loadReservations("SELECT * FROM reservations WHERE id = $1", [id], client);
      await client.query("COMMIT");
      return rows[0];
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      if ((error as { code?: string }).code === "23P01") throw conflict("Ese horario ya no tiene pistas libres.", "SLOT_FULL");
      throw error;
    } finally {
      client.release();
    }
  }

  async createJoinRequest(input: NewJoinRequest): Promise<JoinRequest> {
    if (input.participantNames.length < 1 || input.participantNames.length > 6) {
      throw badRequest("La solicitud debe incluir entre 1 y 6 participantes.", "INVALID_PARTICIPANT_COUNT");
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query("SELECT * FROM reservations WHERE id = $1 FOR UPDATE", [input.reservationId]);
      const reservation = result.rows[0] as Row | undefined;
      if (!reservation || reservation.status !== "confirmed") throw notFound("No encontramos un grupo activo para ese horario.");
      if (Date.parse(text(reservation.starts_at)) <= Date.now()) throw conflict("La tanda ya comenzó.", "SESSION_STARTED");
      if (text(reservation.organizer_id) === input.requesterId) throw conflict("Ya sos anfitrión de este grupo.", "ALREADY_HOST");
      const existing = await client.query(
        "SELECT 1 FROM reservation_participants WHERE reservation_id = $1 AND added_by_user_id = $2 LIMIT 1",
        [input.reservationId, input.requesterId]
      );
      if (existing.rowCount) throw conflict("Ya formás parte de este grupo.", "ALREADY_MEMBER");
      const duplicate = await client.query(
        "SELECT 1 FROM join_requests WHERE reservation_id = $1 AND requester_id = $2 AND status = 'pending'",
        [input.reservationId, input.requesterId]
      );
      if (duplicate.rowCount) throw conflict("Ya tenés una solicitud pendiente para este grupo.", "REQUEST_EXISTS");
      const count = await client.query(
        "SELECT count(*)::int AS count FROM reservation_participants WHERE reservation_id = $1",
        [input.reservationId]
      );
      if (Number(count.rows[0].count) + input.participantNames.length > 8) {
        throw conflict("El grupo no tiene tantos lugares disponibles.", "CAPACITY_REACHED");
      }
      const status = reservation.join_policy === "open" ? "approved" : "pending";
      const id = randomUUID();
      const saved = await client.query(
        "INSERT INTO join_requests (id, reservation_id, requester_id, status, participant_names, decided_at) VALUES ($1, $2, $3, $4, $5::jsonb, CASE WHEN $4 = 'approved' THEN now() ELSE NULL END) RETURNING *",
        [id, input.reservationId, input.requesterId, status, JSON.stringify(input.participantNames)]
      );
      if (status === "approved") {
        for (const name of input.participantNames) {
          await client.query(
            "INSERT INTO reservation_participants (id, reservation_id, display_name, added_by_user_id) VALUES ($1, $2, $3, $4)",
            [randomUUID(), input.reservationId, name, input.requesterId]
          );
        }
      }
      await client.query("COMMIT");
      return requestFrom(saved.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async listRequestsForOrganizer(userId: string): Promise<Array<JoinRequest & { reservation: Reservation }>> {
    const result = await this.pool.query(
      "SELECT jr.* FROM join_requests jr JOIN reservations r ON r.id = jr.reservation_id WHERE r.organizer_id = $1 AND jr.status = 'pending' AND r.status = 'confirmed' ORDER BY jr.created_at",
      [userId]
    );
    const output: Array<JoinRequest & { reservation: Reservation }> = [];
    for (const row of result.rows as Row[]) {
      const request = requestFrom(row);
      const reservation = await this.getReservation(request.reservationId);
      if (reservation) output.push({ ...request, reservation });
    }
    return output;
  }

  async decideJoinRequest(id: string, organizerId: string, approve: boolean): Promise<JoinRequest> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const lookup = await client.query("SELECT reservation_id FROM join_requests WHERE id = $1", [id]);
      if (!lookup.rows[0]) throw notFound("No encontramos esa solicitud.");
      const reservationId = text((lookup.rows[0] as Row).reservation_id);
      const reservationResult = await client.query("SELECT * FROM reservations WHERE id = $1 FOR UPDATE", [reservationId]);
      const reservation = reservationResult.rows[0] as Row | undefined;
      if (!reservation) throw notFound("No encontramos esa reserva.");
      const requestResult = await client.query("SELECT * FROM join_requests WHERE id = $1 FOR UPDATE", [id]);
      if (!requestResult.rows[0]) throw notFound("No encontramos esa solicitud.");
      const request = requestFrom(requestResult.rows[0]);
      if (request.reservationId !== reservationId) throw conflict("La solicitud no coincide con su grupo.", "INVALID_REQUEST");
      if (text(reservation.organizer_id) !== organizerId) throw conflict("Solo el anfitrión puede responder esta solicitud.", "NOT_REQUEST_HOST");
      if (request.status !== "pending") throw conflict("La solicitud ya fue respondida.", "REQUEST_RESOLVED");
      if (Date.parse(text(reservation.starts_at)) <= Date.now()) throw conflict("La tanda ya comenzó.", "SESSION_STARTED");
      if (approve) {
        const count = await client.query(
          "SELECT count(*)::int AS count FROM reservation_participants WHERE reservation_id = $1",
          [request.reservationId]
        );
        if (Number(count.rows[0].count) + request.participantNames.length > 8) {
          throw conflict("No hay suficientes lugares para aprobar esta solicitud.", "CAPACITY_REACHED");
        }
        for (const name of request.participantNames) {
          await client.query(
            "INSERT INTO reservation_participants (id, reservation_id, display_name, added_by_user_id) VALUES ($1, $2, $3, $4)",
            [randomUUID(), request.reservationId, name, request.requesterId]
          );
        }
      }
      const status = approve ? "approved" : "rejected";
      const updated = await client.query(
        "UPDATE join_requests SET status = $2, decided_at = now() WHERE id = $1 RETURNING *",
        [id, status]
      );
      await client.query("COMMIT");
      return requestFrom(updated.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async cancelReservation(id: string, organizerId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const found = await client.query("SELECT * FROM reservations WHERE id = $1 FOR UPDATE", [id]);
      const reservation = found.rows[0] as Row | undefined;
      if (!reservation) throw notFound("No encontramos esa reserva.");
      if (text(reservation.organizer_id) !== organizerId) throw conflict("Solo el organizador puede cancelar la reserva.", "NOT_RESERVATION_OWNER");
      if (reservation.status !== "confirmed") throw conflict("La reserva ya está cancelada.", "ALREADY_CANCELLED");
      if (Date.parse(text(reservation.starts_at)) <= Date.now()) throw conflict("La tanda ya comenzó.", "SESSION_STARTED");
      await client.query("UPDATE reservations SET status = 'cancelled' WHERE id = $1", [id]);
      await client.query(
        "UPDATE join_requests SET status = 'cancelled', decided_at = now() WHERE reservation_id = $1 AND status = 'pending'",
        [id]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async changeJoinPolicy(id: string, organizerId: string, policy: JoinPolicy): Promise<Reservation> {
    const result = await this.pool.query(
      "UPDATE reservations SET join_policy = $3 WHERE id = $1 AND organizer_id = $2 AND status = 'confirmed' AND starts_at > now() RETURNING id",
      [id, organizerId, policy]
    );
    if (!result.rows[0]) {
      const reservation = await this.getReservation(id);
      if (!reservation) throw notFound("No encontramos esa reserva.");
      throw conflict("No se puede cambiar esta opción; verificá que seas el organizador y que la tanda no haya comenzado.", "POLICY_LOCKED");
    }
    const reservation = await this.getReservation(id);
    if (!reservation) throw notFound();
    return reservation;
  }

  async listBlocks(from?: string, to?: string): Promise<TrackBlock[]> {
    const result = await this.pool.query(
      "SELECT * FROM track_blocks WHERE ($1::timestamptz IS NULL OR ends_at > $1) AND ($2::timestamptz IS NULL OR starts_at < $2) ORDER BY starts_at",
      [from ?? null, to ?? null]
    );
    return (result.rows as Row[]).map(blockFrom);
  }

  async createBlock(input: NewTrackBlock): Promise<TrackBlock> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["karting:" + input.operatingDate]);
      const overlap = await client.query(
        "SELECT 1 FROM reservations WHERE track_id = $1 AND status = 'confirmed' AND tstzrange(starts_at, ends_at, '[)') && tstzrange($2::timestamptz, $3::timestamptz, '[)') LIMIT 1",
        [input.trackId, input.startsAt, input.endsAt]
      );
      if (overlap.rowCount) throw conflict("No se puede bloquear una pista que tiene una tanda confirmada.", "TRACK_IN_USE");
      const existingBlock = await client.query(
        "SELECT 1 FROM track_blocks WHERE track_id = $1 AND tstzrange(starts_at, ends_at, '[)') && tstzrange($2::timestamptz, $3::timestamptz, '[)') LIMIT 1",
        [input.trackId, input.startsAt, input.endsAt]
      );
      if (existingBlock.rowCount) throw conflict("Ese intervalo ya está bloqueado.", "BLOCK_OVERLAP");
      const id = randomUUID();
      const result = await client.query(
        "INSERT INTO track_blocks (id, track_id, starts_at, ends_at, reason, created_by_admin_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
        [id, input.trackId, input.startsAt, input.endsAt, input.reason, input.createdByAdminId]
      );
      await client.query("COMMIT");
      return blockFrom(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteBlock(id: string): Promise<void> {
    const result = await this.pool.query("DELETE FROM track_blocks WHERE id = $1", [id]);
    if (!result.rowCount) throw notFound("No encontramos ese bloqueo.");
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
