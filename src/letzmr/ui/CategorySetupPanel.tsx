import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BRACKET_SEEDING_LABEL, availableBracketSeedings } from "../domain/bracket";
import type { BracketSeeding, Category } from "../domain/types";
import { useLetzmr } from "./useLetzmr";

/** Ajustes da categoria: grupos, refazer sorteio, limpar e excluir. */
export function CategorySetupPanel({ cat, tournamentId }: { cat: Category; tournamentId: string }) {
  const { store, eng, configureCategory, redrawCategory, clearCategory, deleteCategory } =
    useLetzmr();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [numGroups, setNumGroups] = useState(String(cat.numGroups));
  const [advancers, setAdvancers] = useState(String(cat.advancersPerGroup));
  const [seeding, setSeeding] = useState<BracketSeeding>(cat.bracketSeeding ?? "BY_GROUP");

  const isGroupKo = cat.format === "GROUP_KO";
  const hasDraw = eng.hasDraw(cat.id);
  const regCount = store.registrations.filter((r) => r.categoryId === cat.id).length;
  const scoredCount = store.matches.filter(
    (m) => m.categoryId === cat.id && (m.status === "played" || m.status === "wo"),
  ).length;

  const groupsN = Number(numGroups);
  const advancersParsed = advancers.trim() === "" ? NaN : Number(advancers);
  const single = groupsN === 1;
  const advancersN = single
    ? advancersParsed === 0
      ? 0
      : 2
    : Number.isFinite(advancersParsed)
      ? advancersParsed
      : NaN;
  const seedingOptions = availableBracketSeedings(groupsN, advancersN);
  const effectiveSeeding: BracketSeeding = single ? "BY_GROUP" : seeding;
  const seedingBlocked = isGroupKo && !seedingOptions[effectiveSeeding].available;
  const invalid =
    !Number.isInteger(groupsN) || groupsN < 1 || !Number.isInteger(advancersN) || advancersN < 0;
  const unchanged =
    groupsN === cat.numGroups &&
    advancersN === cat.advancersPerGroup &&
    effectiveSeeding === (cat.bracketSeeding ?? "BY_GROUP");

  const discardWarning = hasDraw
    ? `\n\nO sorteio atual, os jogos${scoredCount ? ` e ${scoredCount} placar(es) lançado(s)` : ""} serão apagados. As inscrições são mantidas.`
    : "";

  const exec = (fn: () => Promise<string>) => {
    setBusy(true);
    setError("");
    setMsg("");
    fn()
      .then((m) => m && setMsg(m))
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"))
      .finally(() => setBusy(false));
  };

  return (
    <section
      className="space-y-4 rounded-lg border border-[hsl(var(--border))] p-4"
      data-testid="category-setup"
    >
      <h2 className="text-lg font-semibold">Ajustes e sorteio</h2>

      {isGroupKo && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="cfg-groups">Nº de grupos</Label>
              <Input
                id="cfg-groups"
                data-testid="cfg-groups"
                value={numGroups}
                onChange={(e) => setNumGroups(e.target.value)}
              />
            </div>
            {single ? (
              <div className="space-y-1 sm:col-span-2">
                <Label>Grupo único: como termina?</Label>
                <Select
                  value={advancersN === 0 ? "0" : "2"}
                  onValueChange={(v) => setAdvancers(v)}
                >
                  <SelectTrigger data-testid="cfg-single-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Termina no grupo (todos contra todos)</SelectItem>
                    <SelectItem value="2">1º e 2º do grupo jogam uma final</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1">
                <Label htmlFor="cfg-adv">Classificados por grupo</Label>
                <Input
                  id="cfg-adv"
                  data-testid="cfg-advancers"
                  value={advancers}
                  onChange={(e) => setAdvancers(e.target.value)}
                />
              </div>
            )}
            {!single && (
              <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                <Label>Posição dos classificados na chave</Label>
                <Select value={seeding} onValueChange={(v) => setSeeding(v as BracketSeeding)}>
                  <SelectTrigger data-testid="cfg-seeding">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(BRACKET_SEEDING_LABEL) as BracketSeeding[]).map((key) => (
                      <SelectItem key={key} value={key} disabled={!seedingOptions[key].available}>
                        {BRACKET_SEEDING_LABEL[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {seedingBlocked && (
                  <p className="text-xs text-[hsl(var(--destructive))]">
                    {seedingOptions[effectiveSeeding].reason}
                  </p>
                )}
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="secondary"
            data-testid="cfg-save"
            disabled={busy || invalid || seedingBlocked || unchanged}
            onClick={() => {
              if (
                hasDraw &&
                !window.confirm(`Alterar a configuração dos grupos?${discardWarning}`)
              ) {
                return;
              }
              exec(async () => {
                const res = await configureCategory(cat.id, {
                  numGroups: groupsN,
                  advancersPerGroup: advancersN,
                  bracketSeeding: effectiveSeeding,
                });
                return res.drawDiscarded
                  ? "Grupos ajustados. O sorteio anterior foi apagado: faça um novo sorteio."
                  : "Grupos ajustados.";
              });
            }}
          >
            Salvar grupos
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {hasDraw && (
          <Button
            type="button"
            variant="outline"
            data-testid="redraw"
            disabled={busy || regCount < 2}
            onClick={() => {
              if (
                !window.confirm(
                  `Refazer o sorteio?${discardWarning}\n\nOs jogos serão gerados de novo com uma nova distribuição.`,
                )
              ) {
                return;
              }
              exec(async () => {
                await redrawCategory(cat.id);
                return "Sorteio refeito.";
              });
            }}
          >
            Refazer sorteio
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          data-testid="clear-draw"
          disabled={busy || !hasDraw}
          onClick={() => {
            if (
              !window.confirm(
                `Limpar sorteio e placares de "${cat.name}"?${discardWarning}\n\nA página pública, se houver, sai do ar.`,
              )
            ) {
              return;
            }
            exec(async () => {
              await clearCategory(cat.id);
              return "Sorteio e placares apagados. As inscrições foram mantidas.";
            });
          }}
        >
          Limpar sorteio e placares
        </Button>
        <Button
          type="button"
          variant="outline"
          data-testid="clear-all"
          disabled={busy || (!hasDraw && regCount === 0)}
          onClick={() => {
            if (
              !window.confirm(
                `Limpar TUDO de "${cat.name}"?\n\nApaga as ${regCount} inscrição(ões), o sorteio, os jogos e os placares. A categoria continua existindo, vazia.`,
              )
            ) {
              return;
            }
            exec(async () => {
              await clearCategory(cat.id, { removeRegistrations: true });
              return "Categoria limpa: sem inscrições, sorteio nem placares.";
            });
          }}
        >
          Limpar tudo (inclui inscrições)
        </Button>
        <Button
          type="button"
          variant="destructive"
          data-testid="delete-category"
          disabled={busy}
          onClick={() => {
            if (
              !window.confirm(
                `Excluir a categoria "${cat.name}"?\n\nApaga inscrições, sorteio, jogos e placares${cat.published ? " e tira a página pública do ar" : ""}. Não dá para desfazer.`,
              )
            ) {
              return;
            }
            setBusy(true);
            setError("");
            deleteCategory(cat.id)
              .then(() => navigate(`/t/${tournamentId}`))
              .catch((e) => {
                setError(e instanceof Error ? e.message : "Erro");
                setBusy(false);
              });
          }}
        >
          Excluir categoria
        </Button>
      </div>

      {msg && <p className="text-sm">{msg}</p>}
      {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}
    </section>
  );
}
