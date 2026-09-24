import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("junta condicionais e ignora falsos", () => {
    expect(cn("a", false && "b", undefined, "c")).toBe("a c");
  });

  it("o último utilitário do mesmo grupo vence", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
    expect(cn("p-4", "p-[13px]")).toBe("p-[13px]");
  });

  // nomes do @theme que o tailwind-merge não conhece sozinho
  it("entende a escala de texto do app (text-md é tamanho, não cor)", () => {
    expect(cn("text-xs", "text-md")).toBe("text-md");
    expect(cn("text-lg text-ink", "text-2xs")).toBe("text-ink text-2xs");
  });

  it("entende os raios do app", () => {
    expect(cn("rounded-app-sm", "rounded-pill")).toBe("rounded-pill");
    expect(cn("rounded-lg", "rounded-xl")).toBe("rounded-xl");
  });

  it("cor e tamanho de texto não se anulam", () => {
    expect(cn("text-md text-sub", "text-caneta")).toBe("text-md text-caneta");
  });

  it("variantes responsivas convivem com a base", () => {
    expect(cn("w-full", "desktop:w-fit")).toBe("w-full desktop:w-fit");
  });
});
