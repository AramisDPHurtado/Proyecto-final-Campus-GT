import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { DateTime } from "luxon";
import { createApp } from "./app.js";
import { MemoryStore } from "./repositories/memory-store.js";

describe("API de reservas", () => {
  let store: MemoryStore;
  let app: ReturnType<typeof createApp>;
  beforeEach(() => {
    store = new MemoryStore();
    app = createApp({
      store,
      jwtSecret: "test-secret-that-is-at-least-24-characters",
      now: () => DateTime.fromISO("2026-11-30T12:00:00", { zone: "America/Argentina/Buenos_Aires" })
    });
  });

  async function register(name: string) {
    const response = await request(app).post("/api/auth/register").send({
      name,
      email: name.toLowerCase().replaceAll(" ", ".") + "@example.test",
      password: "correct-horse-battery"
    });
    expect(response.status).toBe(201);
    return { token: response.body.token as string, user: response.body.user as { id: string; name: string } };
  }

  it("protege las reservas, publica disponibilidad y respeta grupo abierto y aprobación", async () => {
    const availability = await request(app).get("/api/availability?date=2026-12-01");
    expect(availability.status).toBe(200);
    expect(availability.body.slots[0].label).toBe("13:00");
    const denied = await request(app).post("/api/sessions").send({});
    expect(denied.status).toBe(401);

    const host = await register("Host Uno");
    const joiner = await register("Joiner Uno");
    const other = await register("Joiner Dos");
    const start = (hour: number) => DateTime.fromISO(`2026-12-01T${String(hour).padStart(2, "0")}:00:00`, { zone: "America/Argentina/Buenos_Aires" }).toUTC().toISO();

    const openSession = await request(app).post("/api/sessions")
      .set("Authorization", "Bearer " + host.token)
      .send({ startsAt: start(13), guestNames: ["Amiga Host"], joinPolicy: "open" });
    expect(openSession.status).toBe(201);
    expect(openSession.body.session.participantCount).toBe(2);
    expect(openSession.body.session.trackId).toBe(1);
    const openJoin = await request(app).post(`/api/sessions/${openSession.body.session.id}/join-requests`)
      .set("Authorization", "Bearer " + joiner.token).send({ guestNames: [] });
    expect(openJoin.status).toBe(200);
    expect(openJoin.body.request.status).toBe("approved");

    const closedSession = await request(app).post("/api/sessions")
      .set("Authorization", "Bearer " + host.token)
      .send({ startsAt: start(14), guestNames: ["Amiga Host"], joinPolicy: "approval" });
    expect(closedSession.status).toBe(201);
    const pending = await request(app).post(`/api/sessions/${closedSession.body.session.id}/join-requests`)
      .set("Authorization", "Bearer " + other.token).send({ guestNames: [] });
    expect(pending.status).toBe(202);
    const inbox = await request(app).get("/api/me/sessions").set("Authorization", "Bearer " + host.token);
    expect(inbox.body.incomingRequests).toHaveLength(1);
    const approved = await request(app).post(`/api/join-requests/${pending.body.request.id}/approve`)
      .set("Authorization", "Bearer " + host.token);
    expect(approved.status).toBe(200);
    const updated = await request(app).get(`/api/sessions/${closedSession.body.session.id}`);
    expect(updated.body.session.participantCount).toBe(3);
  });
});
