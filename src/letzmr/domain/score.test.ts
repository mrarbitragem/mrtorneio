import { describe, expect, it } from "vitest";
import { parseSingleSetDraft } from "./score";

describe("parseSingleSetDraft", () => {
  it("aceita games inteiros sem empate", () => {
    expect(parseSingleSetDraft("6", "3")).toEqual({ gamesA: 6, gamesB: 3 });
  });

  it("campo em branco vale 0 se o outro lado está preenchido", () => {
    expect(parseSingleSetDraft("", "6")).toEqual({ gamesA: 0, gamesB: 6 });
    expect(parseSingleSetDraft("6", "")).toEqual({ gamesA: 6, gamesB: 0 });
  });

  it("rejeita vazio, empate e valores inválidos", () => {
    expect(parseSingleSetDraft("", "")).toBeNull();
    expect(parseSingleSetDraft("6", "6")).toBeNull();
    expect(parseSingleSetDraft("6.5", "3")).toBeNull();
    expect(parseSingleSetDraft("-1", "6")).toBeNull();
    expect(parseSingleSetDraft("x", "3")).toBeNull();
  });
});
