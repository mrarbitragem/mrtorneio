# Clone requirements: LetzPlay
Updated: 2026-10-20 · Status: draft

## Problem and users

Organizers and spectators of a beach-tennis category need the public page to show who finished where in each group, why a tie broke, and the knockout as a bracket. MRTorneio already computes standings and a knockout list. The missing product is that page and the publish step in front of it.

## Launch blockers

From `clone/barriers.md`, severity `blocks launch` and `adds lead time`, with who clears each one and when.

| Barrier | Severity | Owner | Start by |
|---|---|---|---|
| BR-001 | adds lead time | Product owner | Before any public copy of layout or wording |
| BR-002 | moat | Product owner | Accept that profiles and rankings stay out of scope |

## Core loop

1. Category is Grupo + Chaves with a group count and a number of qualifiers.
2. Organizer generates matches, then publishes the bracket. Those are separate.
3. Spectators open groups and see pairs in place order. A tie-break link appears only when a later criterion was used.
4. Spectators open the bracket and see rounds in columns, with games and a tie-break digit.
5. Horários lists the same matches by time, including group matches.

## Scope by priority

P1: S-001 and S-002. P2: S-003 and the generate/publish split. P3: the other dispute models on S-006.

## Acceptance

See `clone/parity.md`.

## Out of scope for the first build

Finance, social actions, friend requests, king-of-the-court, Super 8 and Super 12.
