import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ScheduleConflict } from "../domain/types";
import { useLetzmr } from "./useLetzmr";

/** Programa todos os jogos pendentes de um grupo de uma vez. */
export function GroupScheduleForm({
  groupId,
  groupLabel,
  onDone,
  onError,
}: {
  groupId: string;
  groupLabel: string;
  onDone: (message: string, conflicts: ScheduleConflict[]) => void;
  onError: (message: string) => void;
}) {
  const { run } = useLetzmr();
  const [start, setStart] = useState("");
  const [minutes, setMinutes] = useState("40");
  const [courts, setCourts] = useState("");
  const [sameTime, setSameTime] = useState(false);
  const [busy, setBusy] = useState(false);

  const minutesN = Number(minutes);
  const valid = Boolean(start) && (sameTime || (Number.isInteger(minutesN) && minutesN >= 1));

  return (
    <div
      className="flex flex-wrap items-end gap-3 rounded-md border border-dashed border-[hsl(var(--border))] p-3"
      data-testid={`schedule-group-${groupId}`}
    >
      <div className="space-y-1">
        <Label className="text-xs">1º jogo do {groupLabel}</Label>
        <Input
          type="datetime-local"
          className="w-48"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          aria-label="Início do grupo"
        />
      </div>
      {!sameTime && (
        <div className="space-y-1">
          <Label className="text-xs">Minutos por jogo</Label>
          <Input
            className="w-20"
            inputMode="numeric"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            aria-label="Minutos por jogo"
          />
        </div>
      )}
      <div className="space-y-1">
        <Label className="text-xs">Quadras (separe por vírgula, opcional)</Label>
        <Input
          className="w-56"
          value={courts}
          placeholder="Quadra 1, Quadra 2"
          onChange={(e) => setCourts(e.target.value)}
          aria-label="Quadras"
        />
      </div>
      <label className="flex items-center gap-2 pb-2 text-sm">
        <input
          type="checkbox"
          checked={sameTime}
          onChange={(e) => setSameTime(e.target.checked)}
          data-testid="same-time"
        />
        Todos os jogos no mesmo horário
      </label>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={!valid || busy}
        data-testid="schedule-group"
        onClick={() => {
          setBusy(true);
          const courtList = courts
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean);
          void run((e) =>
            e.scheduleGroup(groupId, {
              startAt: new Date(start).toISOString(),
              minutesPerMatch: sameTime ? 1 : minutesN,
              sameTime,
              courts: courtList,
            }),
          )
            .then((r) =>
              onDone(
                `${r.scheduled} jogo(s) do ${groupLabel} programado(s)${sameTime ? " no mesmo horário" : ""}.` +
                  (r.conflicts.length
                    ? " Há aviso de conflito com outra categoria."
                    : ""),
                r.conflicts,
              ),
            )
            .catch((err) => onError(err instanceof Error ? err.message : "Erro"))
            .finally(() => setBusy(false));
        }}
      >
        Programar o grupo
      </Button>
      <p className="basis-full text-xs text-[hsl(var(--muted-foreground))]">
        {sameTime
          ? "Todos os jogos ainda não disputados do grupo ficam marcados para o mesmo horário; a ordem dos jogos é combinada na hora. As quadras informadas aparecem como o local do grupo."
          : "Distribui os jogos ainda não disputados em horários seguidos, evitando a mesma dupla em jogos colados. Com várias quadras, joga mais de um jogo por horário."}{" "}
        Depois você ainda pode ajustar jogo a jogo.
      </p>
    </div>
  );
}
