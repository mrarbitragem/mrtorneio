# Environment

| Item | Value |
|---|---|
| Level | L4 on the production league. The test league is writable: the user said its users are fictional and every action there is allowed. |
| Browser tool | Cursor IDE browser |
| Browser profile | Session already logged in by the operator. The agent did not type a password. |
| Account | Operator can switch among several leagues. Active context at the end: test league. |
| Plan and trial end | Not recorded. A phone-completion dialog was visible and was not submitted. |
| Window size | Desktop browser tab |

## Location check

Writes this session are ledger rows L-001 and L-002, both on the test league. The production circuit was not changed. The tourney below was the original fence; the user later allowed the whole test league.

| Identifier | Expected value |
|---|---|
| Workspace name | Test league only. Never the production circuit. |
| Sandbox breadcrumb | Test tournament whose name contains "TESTE DE CATEGORIAS" |
| Sandbox URL pattern | `/places/<test-league>/tourneys/53422` |
| Sandbox ID | tourney 53422, categories 374091 and 374092 |

Tourney 37139, category 272714, was published and its first group was scored (L-001, L-002). Other categories on that tourney were left unpublished.

## Preflight

| Check | Result | Date |
|---|---|---|
| Members who could be notified | Not opened. Messages and notifications were not opened, because opening the inbox can mark items read. | 2026-10-20 |
| Automations in the write scope | Not inspected. Publish and three scores were still saved, because the user allowed them. Whether entrants were notified is Q-002. | 2026-10-20 |
| Webhooks and API apps | Not inspected. | 2026-10-20 |
| Integrations (chat, email, calendar, Zapier) | Not inspected. | 2026-10-20 |
| Email and calendar sync | Not inspected. | 2026-10-20 |
| Plan and trial | Unknown. | 2026-10-20 |
| Who can see the sandbox and its records | Category 272714 is now public on the test league. Entrants are fictional. | 2026-10-20 |
| Session start and the team's working hours | About 00:35 America/Sao_Paulo. Observe-only, so working hours did not gate writes. | 2026-10-20 |

## Baseline counts

No records created. Counts below are observations, not a write baseline.

| Record type | Filter | Start | End |
|---|---|---|---|
| Categories on sandbox tourney | tourney 53422 | 2 | 2 |
| Matches on sandbox category 374091 | category about page | 0 | 0 |
