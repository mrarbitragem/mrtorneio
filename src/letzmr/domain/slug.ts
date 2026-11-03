/** Palavras que já são rotas do app e não podem ser slug de torneio. */
const RESERVED = new Set(["login", "painel", "t", "public", "letzmr"]);

export type Named = { id: string; name: string };

/** Torneio Interno Serginho → torneio-interno-serginho */
export function slugifyName(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  if (!slug) return "torneio";
  if (RESERVED.has(slug)) return `torneio-${slug}`;
  return slug;
}

function shortId(id: string): string {
  return id.replace(/^(t_|c_)/, "").slice(-6).toLowerCase();
}

/** Slug estável por id: o primeiro (por id) fica com o nome; empate ganha sufixo. */
export function slugsFor(items: Named[]): Map<string, string> {
  const byBase = new Map<string, Named[]>();
  for (const item of items) {
    const base = slugifyName(item.name);
    const list = byBase.get(base) ?? [];
    list.push(item);
    byBase.set(base, list);
  }
  const map = new Map<string, string>();
  for (const [base, group] of byBase) {
    const sorted = [...group].sort((a, b) => a.id.localeCompare(b.id));
    sorted.forEach((item, index) => {
      map.set(item.id, index === 0 ? base : `${base}-${shortId(item.id)}`);
    });
  }
  return map;
}

export function slugOf(item: Named, peers: Named[]): string {
  const list = peers.some((p) => p.id === item.id) ? peers : [...peers, item];
  return slugsFor(list).get(item.id) ?? slugifyName(item.name);
}

export function publicTournamentPath(tournament: Named, tournaments: Named[]): string {
  return `/${slugOf(tournament, tournaments)}`;
}

export function publicCategoryPath(
  tournament: Named,
  category: Named,
  tournaments: Named[],
  categories: Named[],
): string {
  return `${publicTournamentPath(tournament, tournaments)}/${slugOf(category, categories)}`;
}
