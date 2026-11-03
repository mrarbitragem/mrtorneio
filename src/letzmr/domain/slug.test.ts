import { describe, expect, it } from "vitest";
import { publicCategoryPath, slugifyName, slugsFor } from "./slug";

describe("slug de página pública", () => {
  it("vira o nome do torneio e da categoria em endereço curto", () => {
    expect(slugifyName("Torneio Interno Serginho")).toBe("torneio-interno-serginho");
    expect(slugifyName("Feminina Avançada")).toBe("feminina-avancada");
    expect(slugifyName("Masculina Avançada")).toBe("masculina-avancada");
    expect(slugifyName("Painel")).toBe("torneio-painel");
  });

  it("desempata dois nomes iguais com o id", () => {
    const slugs = slugsFor([
      { id: "c_aaaaaa", name: "Open" },
      { id: "c_bbbbbb", name: "Open" },
    ]);
    expect(slugs.get("c_aaaaaa")).toBe("open");
    expect(slugs.get("c_bbbbbb")).toBe("open-bbbbbb");
  });

  it("monta o caminho amigável da categoria", () => {
    const path = publicCategoryPath(
      { id: "t1", name: "Torneio Interno Serginho" },
      { id: "c1", name: "Feminina Avançada" },
      [{ id: "t1", name: "Torneio Interno Serginho" }],
      [{ id: "c1", name: "Feminina Avançada" }],
    );
    expect(path).toBe("/torneio-interno-serginho/feminina-avancada");
  });
});
