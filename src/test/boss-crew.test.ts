import { describe, it, expect } from "vitest";
import { crewAt } from "@/game/engine";

describe("boss crew rotation", () => {
  it("Murali chases alone before 1000 m", () => expect(crewAt(500)).toBe(0));
  it("Sumeet takes over from 1000 m", () => expect(crewAt(1000)).toBe(1));
  it("both chase from 2000 m", () => expect(crewAt(2500)).toBe(2));
  it("Murali alone again from 3000 m", () => expect(crewAt(3000)).toBe(0));
  it("Sumeet again from 4000 m", () => expect(crewAt(4200)).toBe(1));
});
