# Parity tests

Derived from the rules. Each test should fail on today's MRTorneio public category page and pass after the draw UI exists.

| Test | Rule | Expectation |
|---|---|---|
| P-01 | R-001 | Public group view shows place, two names and no V-D table as the primary row |
| P-02 | R-002 | Tie-break control is present only on groups that used a criterion after wins |
| P-03 | R-003 | Two tied pairs are split by head-to-head. Three or more follow set balance, game balance, set rate, game rate, draw, and a later two-pair remainder returns to head-to-head |
| P-04 | R-004 | Opening the first knockout round still shows later rounds in columns |
| P-05 | R-005 | **Decision (owner, 2026-10-20): deliberately not copied.** A set is shown as games only, `7x6` or `9x8` for a pro set, with no tie-break digit. LetzPlay shows the digit, MRTorneio does not. |
| P-06 | R-006 | Horários lists group matches by time and court. The same matches stay on Horários after the group page moves them behind Visualizar |
| P-07 | R-007 | Generate and publish are two actions. An unpublished draw is not the public page |
| P-08 | R-008 | Four groups with two qualifiers seed 1st A vs 2nd C and the mirror fixtures. This is the "por grupo" option. MRTorneio also offers "ranking cruzado" per category, from the Árbitro BT prototype (2 to 8 groups). |
| P-09 | R-012 | Before the group's results, its matches sit under the places. After every result, they sit behind Visualizar |
