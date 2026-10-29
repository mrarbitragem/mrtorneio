import { describe, expect, it } from "vitest";
import { parseRegistrationList } from "./registrationList";

describe("lista de inscrições", () => {
  it("lê a lista numerada do organizador", () => {
    const text = `1. Dilma / Sueli
2. Gisele/ Bia
3. Renata / Patricia
4. Marcinha / Júlia
5. Bianca / Laura
6. Sol / Andrea
7. Marcela/Rafa`;
    const r = parseRegistrationList(text, "doubles");
    expect(r.errors).toEqual([]);
    expect(r.entries).toEqual([
      ["Dilma", "Sueli"],
      ["Gisele", "Bia"],
      ["Renata", "Patricia"],
      ["Marcinha", "Júlia"],
      ["Bianca", "Laura"],
      ["Sol", "Andrea"],
      ["Marcela", "Rafa"],
    ]);
  });

  it("aceita sem numeração, outros estilos de numeração, linhas em branco e espaços extras", () => {
    const r = parseRegistrationList("\n  Ana   Maria / Bia \n2) Cris / Duda\n3 - Eva / Fabi\n\n4 Gabi / Helo\r\n", "doubles");
    expect(r.errors).toEqual([]);
    expect(r.entries).toEqual([
      ["Ana Maria", "Bia"],
      ["Cris", "Duda"],
      ["Eva", "Fabi"],
      ["Gabi", "Helo"],
    ]);
  });

  it("dupla com 1 nome é erro, com a linha indicada", () => {
    const r = parseRegistrationList("1. Dilma / Sueli\n2. Gisele\n3. Ana / ", "doubles");
    expect(r.entries).toEqual([["Dilma", "Sueli"]]);
    expect(r.errors.map((e) => e.line)).toEqual([2, 3]);
    expect(r.errors[0].message).toMatch(/2 nomes.*só encontrei 1/);
    expect(r.errors[1].message).toMatch(/Falta o nome/);
  });

  it("dupla com 3 nomes ou nomes iguais é erro", () => {
    const r = parseRegistrationList("A / B / C\nAna / ana", "doubles");
    expect(r.errors).toHaveLength(2);
    expect(r.errors[0].message).toMatch(/encontrei 3/);
    expect(r.errors[1].message).toMatch(/mesmo nome/);
  });

  it("simples: um nome por linha, sem barra", () => {
    const ok = parseRegistrationList("1. Ana\n2. Bia", "singles");
    expect(ok.entries).toEqual([["Ana"], ["Bia"]]);
    const bad = parseRegistrationList("Ana / Bia", "singles");
    expect(bad.errors[0].message).toMatch(/simples/i);
  });

  it("avisa nomes repetidos sem bloquear", () => {
    const r = parseRegistrationList("Ana / Bia\nCris / ANA", "doubles");
    expect(r.errors).toEqual([]);
    expect(r.entries).toHaveLength(2);
    expect(r.repeatedNames).toEqual(["Ana"]);
  });
});

describe("caracteres invisíveis (colar do WhatsApp/notas)", () => {
  it("remove U+2060 e outros invisíveis dos nomes e da numeração", () => {
    const text = "\u20601. \u2060Guilherme\u2060 / \u200eDaniel\n2) Zuza\u00a0/\u2060Carlos";
    const r = parseRegistrationList(text, "doubles");
    expect(r.errors).toEqual([]);
    expect(r.entries).toEqual([
      ["Guilherme", "Daniel"],
      ["Zuza", "Carlos"],
    ]);
  });
});
