import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Athlete, Category, Group, Registration } from "../domain/types";

const selectClass =
  "h-8 max-w-[16rem] rounded-md border border-[hsl(var(--border))] bg-background px-2 text-xs";

export function RegistrationEditor({
  reg,
  cat,
  groups,
  athletes,
  allRegs,
  canRemove,
  onRename,
  onSwap,
  onMove,
  onRemove,
}: {
  reg: Registration;
  cat: Category;
  groups: Group[];
  athletes: Athlete[];
  allRegs: Registration[];
  canRemove: boolean;
  onRename: (names: string[]) => Promise<void>;
  onSwap: (otherId: string) => Promise<void>;
  onMove: (groupId: string) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const group = groups.find((g) => g.id === reg.groupId);
  const currentNames = athleteNames(reg, athletes);
  const [editing, setEditing] = useState(false);
  const [n1, setN1] = useState(currentNames[0] ?? "");
  const [n2, setN2] = useState(currentNames[1] ?? "");
  const [busy, setBusy] = useState(false);

  const others = allRegs.filter((r) => r.id !== reg.id && r.groupId && r.groupId !== reg.groupId);
  const otherGroups = groups.filter((g) => g.id !== reg.groupId);

  const startEdit = () => {
    const names = athleteNames(reg, athletes);
    setN1(names[0] ?? "");
    setN2(names[1] ?? "");
    setEditing(true);
  };

  const save = async () => {
    const names = cat.entryType === "doubles" ? [n1, n2] : [n1];
    setBusy(true);
    try {
      await onRename(names);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="space-y-2 border-b border-[hsl(var(--border))] py-2 last:border-b-0" data-testid="registration-row">
      {editing ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Input
              className="h-8 w-40"
              value={n1}
              onChange={(e) => setN1(e.target.value)}
              aria-label="Atleta 1"
              data-testid="edit-athlete-1"
            />
          </div>
          {cat.entryType === "doubles" && (
            <div className="space-y-1">
              <Input
                className="h-8 w-40"
                value={n2}
                onChange={(e) => setN2(e.target.value)}
                aria-label="Atleta 2"
                data-testid="edit-athlete-2"
              />
            </div>
          )}
          <Button type="button" size="sm" disabled={busy} data-testid="save-registration" onClick={() => void save()}>
            Salvar
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 flex-1">
            {reg.displayName}
            {group ? ` · ${group.label}` : ""}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            data-testid="edit-registration"
            onClick={startEdit}
          >
            Editar nome
          </Button>
          {canRemove && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-[hsl(var(--destructive))]"
              data-testid="remove-registration"
              onClick={() => void onRemove()}
            >
              Remover
            </Button>
          )}
        </div>
      )}

      {reg.groupId && (others.length > 0 || otherGroups.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {others.length > 0 && (
            <select
              className={selectClass}
              defaultValue=""
              aria-label="Trocar de grupo com"
              data-testid="swap-registration"
              disabled={busy}
              onChange={(e) => {
                const otherId = e.target.value;
                e.target.value = "";
                if (!otherId) return;
                setBusy(true);
                void onSwap(otherId).finally(() => setBusy(false));
              }}
            >
              <option value="">Trocar de grupo com…</option>
              {others.map((other) => {
                const otherGroup = groups.find((g) => g.id === other.groupId);
                return (
                  <option key={other.id} value={other.id}>
                    {otherGroup?.label ?? "Grupo"} — {other.displayName}
                  </option>
                );
              })}
            </select>
          )}
          {otherGroups.length > 0 && (
            <select
              className={selectClass}
              defaultValue=""
              aria-label="Mover para grupo"
              data-testid="move-registration"
              disabled={busy}
              onChange={(e) => {
                const groupId = e.target.value;
                e.target.value = "";
                if (!groupId) return;
                setBusy(true);
                void onMove(groupId).finally(() => setBusy(false));
              }}
            >
              <option value="">Mover sem troca para…</option>
              {otherGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </li>
  );
}

function athleteNames(reg: Registration, athletes: Athlete[]): string[] {
  const fromIds = reg.athleteIds
    .map((id) => athletes.find((a) => a.id === id)?.displayName ?? "")
    .filter(Boolean);
  if (fromIds.length > 0) return fromIds;
  return reg.displayName.split(" / ").map((part) => part.trim());
}
