import { useState } from "react";
import { Link, useParams } from "react-router-dom";
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
import type { BracketSeeding, CategoryFormat } from "../domain/types";
import { useLetzmr } from "./useLetzmr";

export function LetzmrTournamentPage() {
  const { tournamentId } = useParams();
  const { store, run } = useLetzmr();
  const t = store.tournaments.find((x) => x.id === tournamentId);
  const cats = store.categories.filter((c) => c.tournamentId === tournamentId);

  const [name, setName] = useState("");
  const [format, setFormat] = useState<CategoryFormat>("GROUP_KO");
  const [entryType, setEntryType] = useState<"singles" | "doubles">("singles");
  const [numGroups, setNumGroups] = useState("2");
  const [advancers, setAdvancers] = useState("2");
  const [seeding, setSeeding] = useState<BracketSeeding>("BY_GROUP");
  const [error, setError] = useState("");

  const groupsN = Number(numGroups) || 2;
  const advancersN = Number(advancers) || 2;
  const seedingOptions = availableBracketSeedings(groupsN, advancersN);
  const seedingBlocked = format === "GROUP_KO" && !seedingOptions[seeding].available;

  if (!t) {
    return (
      <p>
        Torneio não encontrado. <Link to="/">Voltar</Link>
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link to="/" className="text-sm text-[hsl(var(--muted-foreground))] hover:underline">
          ← Torneios
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{t.name}</h1>
      </div>

      <section className="space-y-3 rounded-lg border border-[hsl(var(--border))] p-4">
        <h2 className="text-lg font-semibold">Nova categoria</h2>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          Formatos MVP: Grupo + Chaves (G+C) ou Eliminatória direta. Equipe / Rainha não disponíveis.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Formato</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as CategoryFormat)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GROUP_KO">Grupo + Chaves (G+C)</SelectItem>
                <SelectItem value="KO">Eliminatória direta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Inscrição</Label>
            <Select
              value={entryType}
              onValueChange={(v) => setEntryType(v as "singles" | "doubles")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="singles">Simples</SelectItem>
                <SelectItem value="doubles">Duplas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {format === "GROUP_KO" && (
            <>
              <div className="space-y-1">
                <Label>Nº de grupos</Label>
                <Input value={numGroups} onChange={(e) => setNumGroups(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Classificados por grupo</Label>
                <Input value={advancers} onChange={(e) => setAdvancers(e.target.value)} />
              </div>
              <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                <Label>Posição dos classificados na chave</Label>
                <Select value={seeding} onValueChange={(v) => setSeeding(v as BracketSeeding)}>
                  <SelectTrigger data-testid="bracket-seeding">
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
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {seedingBlocked
                    ? seedingOptions[seeding].reason
                    : seeding === "BY_GROUP"
                      ? "Cada vaga é fixa por grupo, como no LetzPlay. Disponível para 2 ou 4 grupos (2 classificados)."
                      : "Os 1ºs colocados são ranqueados entre os grupos e a chave sai desse ranking. Aceita de 2 a 8 grupos (2 classificados), com BYE quando precisar. A chave só é montada com todos os grupos concluídos."}
                </p>
              </div>
            </>
          )}
        </div>
        {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}
        <Button
          type="button"
          disabled={!name.trim() || seedingBlocked}
          onClick={() => {
            setError("");
            void run((eng) =>
              eng.createCategory({
                tournamentId: t.id,
                name: name.trim(),
                format,
                entryType,
                numGroups: groupsN,
                advancersPerGroup: advancersN,
                bracketSeeding: seeding,
              }),
            )
              .then(() => setName(""))
              .catch((e) => setError(e instanceof Error ? e.message : "Erro"));
          }}
        >
          Criar categoria
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Categorias</h2>
        {cats.length === 0 ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Nenhuma categoria.</p>
        ) : (
          <ul className="divide-y divide-[hsl(var(--border))] rounded-lg border border-[hsl(var(--border))]">
            {cats.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {c.format === "GROUP_KO" ? "G+C" : "KO"} · {c.entryType} · {c.status}
                    {c.published ? " · publicada" : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  {c.published && (
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/public/${t.id}/${c.id}`}>Público</Link>
                    </Button>
                  )}
                  <Button asChild size="sm">
                    <Link to={`/t/${t.id}/c/${c.id}`}>Operar</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
