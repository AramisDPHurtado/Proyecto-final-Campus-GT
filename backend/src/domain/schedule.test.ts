import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { slotsForDate, validateFutureBusinessSlot } from "./schedule.js";

describe("calendario del karting en hora argentina", () => {
  it("abre de martes a viernes a las 13 y permite iniciar la última tanda a las 00", () => {
    const slots = slotsForDate("2026-12-01", DateTime.fromISO("2026-11-30T12:00", { zone: "America/Argentina/Buenos_Aires" }));
    expect(slots[0].label).toBe("13:00");
    expect(slots.at(-1)?.label).toBe("23:00");
    expect(slots).toHaveLength(11);
  });

  it("conserva la continuidad de madrugada y atribuye el horario al día operativo previo", () => {
    const slots = slotsForDate("2026-12-02", DateTime.fromISO("2026-12-01T23:30", { zone: "America/Argentina/Buenos_Aires" }));
    expect(slots[0].label).toBe("00:00");
    expect(slots[0].operatingDate).toBe("2026-12-01");
  });

  it("el domingo ofrece continuidad hasta las 03 del lunes y cierra ese lunes", () => {
    const monday = slotsForDate("2026-12-07", DateTime.fromISO("2026-12-06T23:00", { zone: "America/Argentina/Buenos_Aires" }));
    expect(monday.map((slot) => slot.label)).toEqual(["00:00", "01:00", "02:00"]);
    expect(monday.every((slot) => slot.operatingDate === "2026-12-06")).toBe(true);
  });

  it("rechaza lunes fuera de la continuidad del domingo y horarios pasados", () => {
    const now = DateTime.fromISO("2026-12-01T12:00", { zone: "America/Argentina/Buenos_Aires" });
    expect(() => validateFutureBusinessSlot("2026-12-01T11:00:00-03:00", now)).toThrow();
    expect(() => validateFutureBusinessSlot("2026-11-30T22:00:00-03:00", now)).toThrow();
  });
});
