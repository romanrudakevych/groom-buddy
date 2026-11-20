import { describe, expect, it } from "vitest";
import {
  clientDogs,
  dogOwners,
  groomerRetention,
  lastGrooming,
  paymentSplit,
  retentionRate,
  salonOfAppointment,
  serviceNames,
} from "../crm";
import { appt, client, crmData, dog, groomer, service } from "./fixtures";

describe("retention", () => {
  const visits = [
    appt({ dog_id: "d1" }),
    appt({ dog_id: "d1" }),
    appt({ dog_id: "d2" }),
    appt({ dog_id: "d3", groomer_id: "g2" }),
    appt({ dog_id: "d3", groomer_id: "g2" }),
    appt({ dog_id: "d4", status: "Zrušeno" }),
    appt({ dog_id: "d4", status: "Naplánováno" }),
  ];
  it("is the share of dogs with more than one completed visit", () => {
    expect(retentionRate(visits)).toBe(67); // d1 and d3 of d1, d2, d3
  });
  it("is 0 with no completed visits", () => {
    expect(retentionRate([])).toBe(0);
    expect(retentionRate([appt({ status: "Zrušeno" })])).toBe(0);
  });
  it("can be counted per groomer", () => {
    expect(groomerRetention(visits, "g1")).toBe(50);
    expect(groomerRetention(visits, "g2")).toBe(100);
  });
});

describe("payment split", () => {
  it("sums completed visits by payment method", () => {
    expect(
      paymentSplit([
        appt({ price: 1000 }),
        appt({ price: 700, paid_by_card: true }),
        appt({ price: 400, status: "Naplánováno" }),
      ]),
    ).toEqual({ cash: 1000, card: 700 });
  });
});

describe("lookups", () => {
  it("finds the latest completed visit of a dog", () => {
    const latest = appt({ dog_id: "d1", date: "2026-10-20", time: "08:00" });
    const data = crmData({
      appointments: [
        appt({ dog_id: "d1", date: "2026-10-01" }),
        latest,
        appt({ dog_id: "d1", date: "2026-10-25", status: "Naplánováno" }),
        appt({ dog_id: "d2", date: "2026-10-28" }),
      ],
    });
    expect(lastGrooming(data, "d1")).toBe(latest);
    expect(lastGrooming(data, "nope")).toBeNull();
  });

  it("joins service names and skips unknown ids", () => {
    const data = crmData({
      services: [service({ id: "a", name: "Koupání" }), service({ id: "b", name: "Stříhání" })],
    });
    expect(serviceNames(data, ["b", "x", "a"])).toBe("Stříhání, Koupání");
  });

  it("resolves the salon from the visit's groomer", () => {
    const data = crmData({ groomers: [groomer({ id: "g1", salon_id: "s2" })] });
    expect(salonOfAppointment(data, appt({ groomer_id: "g1" }))).toBe("s2");
    expect(salonOfAppointment(data, appt({ groomer_id: "gone" }))).toBeNull();
  });

  it("links dogs and owners both ways", () => {
    const data = crmData({
      clients: [client({ id: "c1", dogIds: ["d1"] }), client({ id: "c2" })],
      dogs: [dog({ id: "d1", clientIds: ["c1"] }), dog({ id: "d2" })],
    });
    expect(dogOwners(data, "d1").map((c) => c.id)).toEqual(["c1"]);
    expect(clientDogs(data, "c1").map((d) => d.id)).toEqual(["d1"]);
    expect(clientDogs(data, "c2")).toEqual([]);
  });
});
