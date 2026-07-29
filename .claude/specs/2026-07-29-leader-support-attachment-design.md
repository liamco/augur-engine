# Design: Leader + Support attachment (11th edition)

**Date:** 2026-07-29
**Status:** Approved (design), pending implementation plan

## Context / Problem

In 11th edition a unit can have **one Leader character and one Support character** attached at the same time, where each character's datasheet lists the base units it may attach to. The engine today supports **only a single "leader"**: `attachLeader(unit, leader)` (a private function inside `Octagon.tsx`) merges one character's abilities onto the unit and sets a single `isLeadingUnit` flag. There is no Support concept, the attach logic is stranded in the UI (untestable), and the flag is named from the leader's perspective despite living on the merged unit.

This refactor generalises attachment to a Leader **and** a Support slot, moves the logic into a shared testable util, and makes the conferral flags read from the core unit's perspective.

## Goals

- A unit may have up to one Leader and one Support attached simultaneously; each is offered only when the character's attachable-units list includes the base unit.
- Both attached characters confer their bonuses.
- Attachment logic lives in a shared, unit-tested engine util (not the UI).
- Conferral condition flags are named from the core (attached-to) unit's perspective.

## Non-goals / Deferred

- Co-attachment *eligibility conditions* (the old unused `TestLeaderConditions` — `allowedExistingLeaderKeywords`, `allowsAnyExistingLeader`). "Usually one of each" edge rules are out of scope; we model the common case.
- The source→format pipeline emitting `support` data (placeholder data is handled — no `support` field ⇒ not offered as a Support).
- Distinguishing *which* character conferred a given bonus for UI attribution (a single conferred flag suffices; a per-role source flag can come later).

## Design

### 1. Data — `Support` mirrors `Leader`

- Add `TestSupportInfo { canSupport: TestDatasheetReference[]; supportNotes: string }` and `support: TestSupportInfo | null` to `TestUnit` (`app/types/Test.ts`), structurally identical to `TestLeaderInfo`/`leader`. A character is a **Leader** if it has a populated `leader.canLead`, a **Support** if it has a populated `support.canSupport` (it may have either). *(Support test data is being added to the manifest separately.)*

### 2. Conferral flags — core-unit perspective

- Attachment sets, on the **merged unit's** `combatState.customState`:
  - **`hasAttachedLeader: true`** when a Leader is attached (replaces `isLeadingUnit`).
  - **`hasAttachedSupport: true`** when a Support is attached (new).
- These are dynamic `customState` keys, resolved by `stateResolver`'s existing `customState` fallback — **no `stateResolver`/type change needed**. A conferred ability gates on `state: "hasAttachedLeader"` / `"hasAttachedSupport"`.
- **Rename in existing test data:** conditions using `isLeadingUnit` → `hasAttachedLeader` (WTP *Alpha Warrior*, Librarian *Psychic Hood* / *Veil of Time*).

### 3. Conferred-ability flag — honest name

- Rename the runtime `Ability.isFromLeader` → **`isConferred`** (set on abilities copied onto a unit by *any* attached character — leader or support). It's runtime-only (never in source data), so this touches only TS: `Ability` type, the attach util, `collectLeaderMechanics` (read), `collectUnitMechanics` (skip).
- Rename `collectLeaderMechanics` → **`collectConferredMechanics`** for consistency (update its import in `collectAllMechanics`). Behaviour unchanged: collects `isConferred` abilities' mechanics (layer stays `leaderAbility`); `collectUnitMechanics` still skips `isConferred` to avoid double-counting.

### 4. Engine — shared `attachCharacters` util

- Create `app/engine/pipeline/attachCharacters.ts`:
  ```ts
  attachCharacters(base: TestUnit, chars: { leader?: TestUnit | null; support?: TestUnit | null }): TestUnit
  ```
  For each present character, append its mechanic-bearing abilities (those with non-empty `mechanics`) onto the unit, flagged `isConferred: true` + `sourceUnitName`, and set the matching customState flag (`hasAttachedLeader` / `hasAttachedSupport`). Attaching neither returns the base unchanged; either or both compose. This replaces `attachLeader` in `Octagon.tsx`.

### 5. UI — two slots per side

`app/ui/modules/Engagements/Octagon.tsx`:
- Per side, keep the **"Attached Leader"** dropdown and add an **"Attached Support"** dropdown. State: `attacker/defenderLeaderIndex` (existing) + `attacker/defenderSupportIndex` (new).
- Leader options = manifest characters whose `leader.canLead` includes the base unit's id (existing filter); Support options = characters whose `support.canSupport` includes it.
- Assemble via `attachCharacters(unitWithState, { leader: selectedLeader, support: selectedSupport })`. Two independent single-selects naturally enforce **at most one of each**.
- Reset the support index alongside the leader index when the base unit changes.

## Verification

TDD. New unit tests for `attachCharacters`, plus an integration test and a manual lab check.

1. **`attachCharacters` unit tests** (fabricated minimal units, deterministic — not dependent on the new manifest data):
   - Leader only → `hasAttachedLeader` set, `hasAttachedSupport` absent, the leader's mechanic-bearing abilities present with `isConferred`.
   - Support only → `hasAttachedSupport` set, `hasAttachedLeader` absent, support abilities conferred.
   - Both → both flags set, both sets of abilities conferred.
   - Neither → base returned unchanged (no flags, no added abilities).
   - Abilities with no `mechanics` are not copied.
2. **Integration (`runCombat`)**: a base unit with a leader conferring one bonus (gated `hasAttachedLeader`) **and** a support conferring another (gated `hasAttachedSupport`) → both resolve; removing either drops only its bonus. Confirms end-to-end collection + gating for both slots.
3. **Regression**: existing `isLeadingUnit`-gated data now uses `hasAttachedLeader`; `collectConferredMechanics` still gathers conferred abilities; full suite green; `tsc` clean apart from the pre-existing `operatorEvaluator` errors.
4. **Lab**: with the new Support test data, select a base unit and confirm both an Attached Leader and an Attached Support can be chosen (one each) and both sets of bonuses/tags show.
