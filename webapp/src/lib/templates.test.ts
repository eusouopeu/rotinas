import { describe, expect, it } from "vitest";
import { bumpMkFreq, marketShareText, topMkFreq, type MkFreqMap } from "./templates";

describe("bumpMkFreq / topMkFreq", () => {
  it("conta por nome (case-insensitive) e guarda últimos unit/qty/aisle", () => {
    let f: MkFreqMap = {};
    f = bumpMkFreq(f, { name: "Arroz", unit: "kg", qty: 1, price: 0, aisle: "Mercearia" });
    f = bumpMkFreq(f, { name: "arroz", unit: "kg", qty: 2, price: 20, aisle: "Mercearia" });
    expect(f["arroz"].count).toBe(2);
    expect(f["arroz"].qty).toBe(2);
    expect(f["arroz"].price).toBe(20);
  });
  it("topMkFreq ordena por contagem e esconde itens já na lista", () => {
    let f: MkFreqMap = {};
    f = bumpMkFreq(f, { name: "Arroz", unit: "kg", qty: 1, price: 0, aisle: "Mercearia" });
    f = bumpMkFreq(f, { name: "Leite", unit: "L", qty: 1, price: 0, aisle: "Laticínios" });
    f = bumpMkFreq(f, { name: "Leite", unit: "L", qty: 1, price: 0, aisle: "Laticínios" });
    expect(topMkFreq(f, []).map((x) => x.name)).toEqual(["Leite", "Arroz"]);
    expect(topMkFreq(f, [{ name: "leite" }]).map((x) => x.name)).toEqual(["Arroz"]);
  });
});

describe("marketShareText", () => {
  it("agrupa pendentes por gôndola na ordem do doc, ignorando marcados", () => {
    const txt = marketShareText({
      title: "Feira",
      aisleOrder: ["Hortifruti", "Mercearia"],
      items: [
        { name: "Arroz", qty: 1, unit: "kg", price: 20, aisle: "Mercearia", checked: false },
        { name: "Banana", qty: 6, unit: "un", aisle: "Hortifruti", checked: false },
        { name: "Café", qty: 1, unit: "un", aisle: "Mercearia", checked: true },
      ],
    });
    expect(txt).toBe("Feira\n\nHortifruti\n• Banana — 6 un\n\nMercearia\n• Arroz — 1kg — R$ 20,00\n");
  });
});
