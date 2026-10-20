# Status: LetzPlay
Updated: 2026-10-20 · Session: s01 · Phase: 5 Deep dive
Environment: L4 on the production league · Sandbox: test league, writes allowed · Open ledger rows: 0 (L-001 and L-002 kept)

## Summary
- Covered: public groups, tie-break, R16 bracket, schedule, and the organizer model for Grupo + Chaves (F-001 to F-006). 12 rules.
- Confirmed: Horários keeps group matches by time and court. The group page lists those matches until the group is complete, then shows Visualizar. A tie of two pairs is head-to-head.
- Not covered: a played group where exactly two pairs share the win-loss balance, network shapes, and every dispute model beyond its label.
- Decide: Q-001 terms. Q-002 (does publish notify?) is still open.

## Next actions
1. Implement S-001 and S-002 in MRTorneio from `clone/parity.md`, including P-03 and P-09.
2. If a two-pair tie must be seen in a live ranking, score a group of four on the test league so two pairs share the win-loss balance.

## Needs human
- Q-001: read the terms and say whether this study should continue.
- Keep the production circuit read-only.

## Blocked
- Nothing on the test league. Q-002 is unknown, not a block: the user allowed publish there.

## Last session
- Published test category 272714 and scored its first group. See log/2026-10-20-s01.md and EV-002.

## Residuals
- L-001 and L-002 stay. The user asked to keep working on the test league. The phone-completion dialog was left untouched. One notification badge was not opened.
