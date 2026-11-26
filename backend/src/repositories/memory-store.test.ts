import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { AppError } from "../domain/errors.js";
import { MemoryStore } from "./memory-store.js";

const future = (hour: number) => DateTime.now().setZone("America/Argentina/Buenos_Aires").plus({ days: 3 }).set({ hour, minute: 0, second: 0, millisecond: 0 });

async function user(store: MemoryStore, name: string) {
  return store.createUser({ name, email: name.toLowerCase().replaceAll(" ", "") + "@example.test", passwordHash: "hash", role: "customer" });
}

describe("reservas y grupos", () => {
  it("asigna automáticamente pistas iguales y no permite una tercera reserva simultánea", async () => {
    const store = new MemoryStore();
    const hostA = await user(store, "Anfitrión A");
    const hostB = await user(store, "Anfitrión B");
    const hostC = await user(store, "Anfitrión C");
    const start = future(16);
    const input = (organizerId: string) => ({ organizerId, operatingDate: start.toISODate()!, startsAt: start.toUTC().toISO()!, endsAt: start.plus({ hours: 1 }).toUTC().toISO()!, joinPolicy: "approval" as const, participantNames: ["Anfitrión", "Acompañante"] });
    const results = await Promise.allSettled([store.createReservation(input(hostA.id)), store.createReservation(input(hostB.id)), store.createReservation(input(hostC.id))]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(2);
    const tracks = (await store.listReservations(start.toUTC().toISO()!, start.plus({ hours: 1 }).toUTC().toISO()!)).map((item) => item.trackId).sort();
    expect(tracks).toEqual([1, 2]);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected?.status === "rejected" && rejected.reason).toBeInstanceOf(AppError);
  });

  it("suma automáticamente a un grupo abierto y deja en espera una solicitud de grupo cerrado", async () => {
    const store = new MemoryStore();
    const host = await user(store, "Anfitrión");
    const guest = await user(store, "Invitado");
    const nextHost = await user(store, "Otro anfitrión");
    const start = future(18);
    const base = { operatingDate: start.toISODate()!, startsAt: start.toUTC().toISO()!, endsAt: start.plus({ hours: 1 }).toUTC().toISO()! };
    const open = await store.createReservation({ ...base, organizerId: host.id, joinPolicy: "open", participantNames: ["Anfitrión", "Compañera"] });
    const joined = await store.createJoinRequest({ reservationId: open.id, requesterId: guest.id, participantNames: ["Invitado"] });
    expect(joined.status).toBe("approved");
    expect((await store.getReservation(open.id))?.participants).toHaveLength(3);
    const closed = await store.createReservation({ ...base, organizerId: nextHost.id, joinPolicy: "approval", participantNames: ["Otro anfitrión", "Compañero"] });
    const pending = await store.createJoinRequest({ reservationId: closed.id, requesterId: guest.id, participantNames: ["Invitado"] });
    expect(pending.status).toBe("pending");
    expect((await store.getReservation(closed.id))?.participants).toHaveLength(2);
    const approved = await store.decideJoinRequest(pending.id, nextHost.id, true);
    expect(approved.status).toBe("approved");
    expect((await store.getReservation(closed.id))?.participants).toHaveLength(3);
  });

  it("no admite participantes por encima del máximo de ocho", async () => {
    const store = new MemoryStore();
    const host = await user(store, "Anfitrión");
    const start = future(19);
    await expect(store.createReservation({ organizerId: host.id, operatingDate: start.toISODate()!, startsAt: start.toUTC().toISO()!, endsAt: start.plus({ hours: 1 }).toUTC().toISO()!, joinPolicy: "open", participantNames: Array.from({ length: 9 }, (_, index) => `Piloto ${index}`) })).rejects.toBeInstanceOf(AppError);
  });
});
