import { describe, expect, it } from "vitest";
import { groomerDogCount } from "../crm";

describe("groomer assigned dogs", () => {
  it("counts only dogs pinned to the groomer and updates after reassignment", () => {
    const dogs = [
      { pinned_groomer_id: "groomer-a" },
      { pinned_groomer_id: "groomer-a" },
      { pinned_groomer_id: "groomer-b" },
      { pinned_groomer_id: null },
    ];
    expect(groomerDogCount(dogs, "groomer-a")).toBe(2);
    expect(groomerDogCount(dogs, "groomer-b")).toBe(1);
    expect(groomerDogCount(dogs, "groomer-c")).toBe(0);
    dogs[0] = { pinned_groomer_id: "groomer-b" };
    expect(groomerDogCount(dogs, "groomer-a")).toBe(1);
    expect(groomerDogCount(dogs, "groomer-b")).toBe(2);
  });
});