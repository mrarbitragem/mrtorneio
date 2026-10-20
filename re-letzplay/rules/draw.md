# Rules: draw

### R-001 A finished group lists pairs by place, not by a stats table
- Given a category whose group matches are all finished
- When the public Grupos/Chaves page is open on the group phase
- Then each group shows pairs ordered 1º, 2º, 3º with avatars and names, and the win-loss table is not on this page
- Evidence: [obs EV-001]
- Feature: F-001 · Screen: S-001

| Probe | Input | Result | Evidence |
|---|---|---|---|
| Finished 8-group category | 3 pairs per group | Eight stacked groups, places 1º to 3º | [obs EV-001] |

### R-002 The tie-break link appears only when a group needed a later criterion
- Given several groups on the same page
- When some groups were separated by wins and others were tied on set balance
- Then Entenda o desempate is shown on the tied groups only
- Evidence: [obs EV-001]
- Feature: F-003 · Screen: S-001

| Probe | Input | Result | Evidence |
|---|---|---|---|
| Eight groups | Groups 02 and 06 | Those two groups carry the link. The others do not. | [obs EV-001] |

### R-003 A tie of exactly two pairs is head-to-head; three or more use the balance cascade
- Given the criteria block on the group page
- When the published order is read
- Then a tie is the same win-loss balance. Two participants are split by confronto direto. Three or more use saldo de sets, saldo de games, aproveitamento of sets, aproveitamento of games, then sorteio. If that cascade later leaves only two tied, those two are also split by confronto direto.
- Evidence: [obs EV-002]
- Feature: F-003 · Screen: S-001

| Probe | Input | Result | Evidence |
|---|---|---|---|
| Criteria modal on a published group category | Read, not submitted | The two-participant sentence names confronto direto. The three-or-more list is the five balance steps. A later sentence repeats head-to-head if the triple cascade leaves two. | [obs EV-002] |
| Explanation of a three-way zero tie | Groups that have not played | Narrative walks sets, games, set rate, game rate, then system draw. It also states that a two-player remainder uses head-to-head. | [obs EV-002] |

### R-004 The R16 page draws the whole remaining bracket, not a single round
- Given a category that reached the semifinals
- When `/draw/2` is open
- Then the page shows 8 R16 matches, 4 QF matches and 2 SF matches in later columns
- Evidence: [obs EV-001]
- Feature: F-002 · Screen: S-002

| Probe | Input | Result | Evidence |
|---|---|---|---|
| Finished category | Phase tab R16 | Match numbers 25–32 are R16, 33–36 are QF, 37–38 are SF | [obs EV-001] |

### R-005 A set score can carry a smaller tie-break digit next to the games
- Given a finished match whose games went to a tie-break
- When the points markup is read
- Then one side is games plus a tie-break digit and the other side is the winning games
- Evidence: [obs EV-001]
- Feature: F-002 · Screen: S-002

| Probe | Input | Result | Evidence |
|---|---|---|---|
| Match points HTML | `6` then `5` against `7` | Display is 6 with tie-break 5, versus 7 | [obs EV-001] |

### R-006 Horários lists group matches by time and court, including after the group page hides them
- Given the Horários tab
- When the list is read
- Then each scheduled line has a clock time, a court, a match number, a phase such as group G1, the pairs and a score. Matches with no slot stay on the same list under "Sem horário definido". The list does not move behind Visualizar when the group is complete.
- Evidence: [obs EV-001] [obs EV-002]
- Feature: F-004 · Screen: S-003

| Probe | Input | Result | Evidence |
|---|---|---|---|
| Finished category | Jogo #1 | Phase text is the group phase, group G1, with a time, a court and a score | [obs EV-001] |
| Published category, group 1 complete, no slots assigned | Horários | Three group-1 matches remain listed under "Sem horário definido", with scores, while the group page shows Visualizar | [obs EV-002] |

### R-007 Generating matches and publishing the bracket are separate actions
- Given the organizer category actions
- When the menu is read
- Then Gerar jogos, Publicar as chaves and Cancelar jogos gerados are three different commands
- Evidence: [obs EV-001]
- Feature: F-005 · Screen: S-004

| Probe | Input | Result | Evidence |
|---|---|---|---|
| Sandbox tourney menu | Labels only, not clicked | Three distinct actions | [obs EV-001] |

### R-008 Qualifiers from four groups are crossed so group-mates do not meet in the first knockout round
- Given the seeding copy on the organizer tourney page
- When four groups qualify two pairs each
- Then 1st of group 01 plays 2nd of group 03, 2nd of group 02 plays 1st of group 04, and the mirror fixtures follow
- Evidence: [obs EV-001]
- Feature: F-005 · Screen: S-004

| Probe | Input | Result | Evidence |
|---|---|---|---|
| Seeding list in the document | 4 groups, 2 qualifiers | Four fixtures as listed | [obs EV-001] |

### R-009 Closing registration blocks players and still allows the organizer to add entries
- Given a category with open registration
- When the close-registration shortcut copy is read
- Then players can no longer subscribe, and the organizer can still add people
- Evidence: [obs EV-001]
- Feature: F-005 · Screen: S-005

| Probe | Input | Result | Evidence |
|---|---|---|---|
| Shortcut text | Not clicked | Copy states both halves | [obs EV-001] |

### R-010 A group-plus-knockout category stores group count and qualifiers per group
- Given sandbox category configuration
- When Configuração is open
- Then the model is Grupo + Chaves, with 4 groups and 2 qualifiers per group, cap 12
- Evidence: [obs EV-001]
- Feature: F-005 · Screen: S-005

| Probe | Input | Result | Evidence |
|---|---|---|---|
| Configuration page | Category with 0 matches | 4 groups, 2 qualifiers, cap 12 | [obs EV-001] |

### R-011 The model picker lists formats other than the current group-plus-knockout
- Given a category already set to Grupo + Chaves
- When Alterar modelo de disputa is open and not submitted
- Then the radios are single elimination, two consolation variants, double elimination, one group, king/queen of the court, Super 8 and Super 12
- Evidence: [obs EV-001]
- Feature: F-006 · Screen: S-006

| Probe | Input | Result | Evidence |
|---|---|---|---|
| Radio list | None selected, form not submitted | Eight models. Current model is absent from the list. | [obs EV-001] |

### R-012 Group matches stay under the group until every result in that group is in
- Given the public Grupos/Chaves page
- When a group still has a match without a result
- Then that group's matches are listed under the place rows, with number, phase and either a slot or "Sem horário definido"
- When every match in the group has a result
- Then those matches leave the list and the footer reads that the group's matches are finished, with Visualizar
- Evidence: [obs EV-002]
- Feature: F-001 · Screen: S-001

| Probe | Input | Result | Evidence |
|---|---|---|---|
| Published category, no scores | Three groups of three | Zero Visualizar. Each group lists Jogo #n under the places. | [obs EV-002] |
| One score in group 1 | 6/3 on match 1 only | Group 1 still lists all three matches. The scored line shows 6/3. | [obs EV-002] |
| All three group-1 scores | 6/3, 4/6, 2/6 | Footer: the group's matches are finished, plus Visualizar. Groups 2 and 3 still list their matches. | [obs EV-002] |
