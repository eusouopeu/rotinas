import { beforeEach, describe, expect, it } from "vitest";
import { bootStorage, load, save, removeKey } from "./storage";

// fake-indexeddb (test-setup.ts) fornece o indexedDB global — os testes
// rodam contra o backend de browser real (mesmo código de produção).

describe("storage boot + load/save/removeKey", () => {
  beforeEach(async () => {
    localStorage.clear();
    // cada teste abre um banco IndexedDB novo para não vazar estado
    indexedDB.deleteDatabase("brita");
    await bootStorage();
  });

  it("load devolve o fallback quando a chave não existe", () => {
    expect(load("chave-inexistente", "padrao")).toBe("padrao");
  });

  it("save + load no mesmo boot (cache em memória síncrono)", () => {
    save("minha_chave", { a: 1 });
    expect(load("minha_chave", null)).toEqual({ a: 1 });
  });

  it("save persiste um snapshot (não a referência)", () => {
    const obj = { a: 1 };
    save("outra_chave", obj);
    obj.a = 999;
    expect(load("outra_chave", null)).toEqual({ a: 1 });
  });

  it("removeKey some com a chave", () => {
    save("temporaria", 42);
    removeKey("temporaria");
    expect(load("temporaria", "sumiu")).toBe("sumiu");
  });

  it("dados gravados sobrevivem a um novo bootStorage (persistência real)", async () => {
    save("sobrevive", "valor");
    // aguarda a fila de persistência assíncrona esvaziar antes do próximo boot
    await new Promise((r) => setTimeout(r, 50));
    await bootStorage();
    expect(load("sobrevive", null)).toBe("valor");
  });
});
