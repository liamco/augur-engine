# Design: Target-aware effect resolution + relative-entity vocabulary

**Date:** 2026-07-28
**Status:** Approved (design), pending implementation plan

## Context / Problem

The combat engine collects mechanics from both units, each tagged with a `perspective`
(which side owns it) and an `entity` (who it targets — e.g. `attackingUnit`, `opposingUnit`).
`entityResolver.resolveEntity()` already turns `entity` + `perspective` into a concrete unit,
and **conditions already use it**. But **effect resolution does not**: `effectResolver.groupByAttribute`
buckets mechanics purely by `attribute` and discards the declared target. Each phase then applies its
bucket to a hard-coded unit (`hit` → attacker's `bsWs`, `save` → defender's `sv`).

Consequence: a modifier lands on whatever unit the phase resolves, regardless of who it was declared to
affect. The concrete symptom is that a unit with an innate **defensive** ability (e.g. Stealth's -1 BS)
selected as the **attacker** penalises its *own* shooting — its penalty should be inert when it is the one
shooting.

The declared intent is already in the data; the engine simply never honours it when applying effects.

## Goals

- Effects apply only to the unit the mechanic actually targets (honour the declared `entity`).
- Keep the engine **thin** and the mechanic **JSON rich** — direction lives entirely in the data
  (`entity` + `phase`), the engine just enforces it.
- Fix the class of "wrong-side" bugs, not just Stealth.

## Non-goals / Out of scope

- `own*` entity-namespace cleanup (separate tidy-up).
- Perspective-aware *targeting eligibility* (Lone Operative, etc.) — a different subsystem.
- Any change to how mechanics are collected or to the `phase`/condition/ignore-state systems.

## Design

### Part 1 — Vocabulary (data)

Direction is expressed by choosing the right existing `entity` value; no new mechanic property is added.

- **Remove** the absolute `attackingUnit` / `attackingModel` from the `Entity` union.
- Hand-authored abilities **and** engine-injected states declare direction with **relative** entities
  (`thisUnit` / `opposingUnit`). Relative entities self-correct: interpreted through the owner's
  `perspective`, "my opponent" points at the right unit whichever side holds the mechanic.
- **Keep** `target*` as the single absolute pair — the deliberate exception for attacker-authored
  "the thing I'm attacking" mechanics (e.g. Incendiary Terror's `targetUnit`).
- **Documented rule:** *hand-authored mechanics use relative entities (`this*`/`opposing*`); `target*`
  is the intentional absolute exception. Absolute references to a fixed role on a both-sides ability are
  the anti-pattern that causes wrong-side bugs.*

Resulting data changes:
- `benefit-of-cover.json`: `attackingUnit` → `opposingUnit` (injected with defender perspective → resolves to the shooter).
- `stealth.json`: `attackingUnit` → `opposingUnit`.
- `hidden.json` and the demonstrative innate STEALTH ability on `infernus-squad.json`: same `attackingUnit` → `opposingUnit`.

### Part 2 — Engine (the fix, kept thin)

Add a single pipeline step that drops **mis-directed** stat-modifiers before bucketing, honouring the
already-resolvable target.

**Attribute → owning side** (the unit whose characteristic/roll that attribute belongs to in a resolution):

| Side | Attributes |
|------|-----------|
| attacker | `hit`, `wound`, `ballisticSkill`, `weaponSkill`, `strength`, `armourPenetration`, `damage`, `attacks` |
| defender | `save`, `toughness`, `invulnSave`, `feelNoPain` |

**New resolver `filterByTarget(mechanics, context)`** (mirrors the existing `filterByPhase` / `filterByConditions`
step shape), inserted in `runCombat` immediately before `resolveEffects`:

For each mechanic:
1. If it has no `attribute`, or its `attribute` is **not** in the map above → **keep** (pass-through;
   behaviours, `addsAbility`, `forceRoll`, non-combat attributes are untouched).
2. Otherwise resolve its target side via `resolveEntity(entity, context, perspective)` and compare the
   returned unit to `context.attacker` / `context.defender`.
3. If the target side **matches** the attribute's owning side → keep; if it is the **opposite** side → **drop**.

`ResolvedModifiers` and every phase resolver stay **unchanged** — the bucket a phase reads simply no longer
contains mis-directed contributions. Dropped mechanics also produce no UI source tag, which is correct.

**Guardrail:** the filter only ever drops a mechanic that has a *directional combat attribute with a known
owning side*. Anything else passes through, so existing non-attribute mechanics (e.g. Incendiary Terror)
are unaffected.

### Why this fixes Stealth (worked example)

| Stealth owner | `opposingUnit` → | attribute | owning side | filter | effect |
|---------------|------------------|-----------|-------------|--------|--------|
| Defender (shot at) | attacker | `ballisticSkill` | attacker | keep | -1 to shooter ✓ |
| Attacker (shooting) | defender | `ballisticSkill` | attacker | **drop** | inert ✓ |

Cover behaves identically (injected with defender perspective → `opposingUnit` = attacker → kept), so its
existing behaviour and non-stacking with Stealth are preserved.

## Affected files

- `app/types/Mechanic.ts`, `app/types/Test.ts` — remove `attackingUnit`/`attackingModel` from the `Entity` unions.
- `app/engine/resolvers/entityResolver.ts` — remove the `attackingUnit`/`attackingModel` cases.
- New `app/engine/resolvers/targetResolver.ts` (or similar) — `filterByTarget` + the attribute→side map.
- `app/engine/pipeline/runCombat.ts` — insert `filterByTarget` before `resolveEffects`.
- Library/data: `benefit-of-cover.json`, `stealth.json`, `hidden.json`, `infernus-squad.json` — `attackingUnit` → `opposingUnit`.
- Tests referencing `attackingUnit` (`runCombat.stealth.test.ts` ignore-cover mechanic, etc.) — update to relative entities.
- Memory note referencing `attackingUnit` — update.

## Verification (behaviour to lock in with tests)

1. **Stealthy attacker → no self-penalty:** a unit with innate STEALTH selected as attacker hits at its
   unmodified target (stealth dropped from the hit bucket).
2. **Stealthy defender → -1 BS to shooter** (unchanged).
3. **Cover unchanged:** -1 BS to shooter; still non-stacking with Stealth (both sources shown, net -1).
4. **Directional offensive modifier:** an attacker-authored "-1 to the defender's save" applies; the same
   mechanic owned by the defender is inert.
5. **Pass-through:** a non-attribute mechanic (e.g. Incendiary Terror battle-shock `forceRoll`) is unaffected.
6. Full existing suite stays green; `tsc` shows only the pre-existing `operatorEvaluator` errors.
