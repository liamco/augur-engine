# Design: Hidden — targeting eligibility

**Date:** 2026-07-28
**Status:** Approved (design), pending implementation plan

## Context / Problem

The next big-ticket rule is **Hidden**: a unit that is Hidden is **not a valid target** to any attacker beyond its *detection range* (15in by default). The engine currently has **no targeting-eligibility concept** — `runCombat` takes an already-chosen attacker/defender/weapon and resolves the attack (hit → wound → save → damage → FNP). There is no notion of "can this attack legally happen?", no distance-to-target, and no per-unit detection range.

This introduces a minimal, general **targeting-eligibility** layer, driven (as far as possible) by the library, keeping the engine thin.

### Rule (agreed scope)

A unit is Hidden — and therefore **not a valid target for attackers beyond its detection range** — when **all** of:
1. its **`isHidden`** state is set (a manual toggle; stands in for the brief's un-modellable "hasn't shot this/last turn"), **and**
2. it is **in cover** (`isInCover`), **and**
3. it has one of the keywords **INFANTRY / SWARM / BEAST**.

When Hidden and the attacker is beyond detection range (`rangeToTarget > detectionRange`), the target is ineligible. The attack phases are still computed; the **UI shows an invalid-target flag**.

`isHidden`, `isInCover`, and the keyword are **separate** on purpose: a unit can be in cover with a valid keyword yet not Hidden (e.g. it shot), so the manual `isHidden` toggle must be independent.

## Goals

- A general targeting-eligibility mechanism, with the Hidden rule expressed in the library.
- `detectionRange` as a real, **modifiable** unit attribute (default **15**), so abilities can override it later with no special-casing.
- Robust against the **placeholder unit data / unfinished pipeline** — everything defaults to 15in until the pipeline emits the field.

## Non-goals / Deferred (do not build now)

- **`distanceToTarget` as a conditionable value** + **Melta / Rapid Fire** "in half range" — the follow-up that reuses `rangeToTarget`; those become `distanceToTarget <= $halfRange` conditions.
- **Lone Operative** (a separate targeting rule with its own threshold).
- **Detection-range-overriding abilities** — the modifier path is built and ready but dormant (no unit/data uses it yet).
- The **source→format pipeline** emitting `detectionRange` (reads default to 15 meanwhile).
- Turn history / "hasn't shot" derivation (the `isHidden` toggle stands in).

## Design

### 1. State + context inputs (data)

- **`CombatState.isHidden: boolean`** (`app/types/State.ts`) — new; manual toggle on the target, mirroring `isInCover`.
- **`CombatContext.rangeToTarget?: number`** (`app/types/CombatContext.ts`) — new; attacker→target distance, threaded through `buildCombatContext` from a UI text field.
- **`stateResolver`** (`app/engine/resolvers/stateResolver.ts`) — add `isHidden: combatState.isHidden` to the state map (cover is already exposed as `benefitOfCover`).

### 2. `detectionRange` as a modifiable unit attribute

- Add **`detectionRange`** to the `UnitAttribute` union (`app/types/Mechanic.ts`).
- Add optional **`detectionRange?: number`** to the model statline (`TestModel` in `app/types/Test.ts`). Reads default to **15** when absent.
- `conditionResolver.resolveAttribute` unit map (`app/engine/resolvers/conditionResolver.ts`) — add `detectionRange: "detectionRange"`, so conditions/modifiers can reference it.
- `filterByTarget` (`app/engine/resolvers/targetResolver.ts`) — add `detectionRange: "defender"` to `ATTRIBUTE_SIDE` (it's the target's stat).

Because it's a normal attribute, an ability overriding detection range is just a `staticNumber`/`rollBonus`/`rollPenalty` mechanic on `detectionRange` — resolved through the existing modifier system and applied by the eligibility resolver. No unit uses this yet (dormant).

### 3. New effect verb: `blocksTargeting`

- Add **`blocksTargeting`** to the `Effect` union (`app/types/Mechanic.ts`). Semantics: *"the owner cannot be targeted beyond its `detectionRange`."* Value is `true`.
- It carries no `attribute`, so `resolveEffects.groupByAttribute` ignores it (correct) and `filterByTarget` passes it through (no attribute → kept).

### 4. New operator: `includesAny`

The existing `includes` with a list means "has **all** of them" (`expected.every`). Hidden needs "has **any** of" and conditions are AND-combined, so this needs a new operator.
- Add **`includesAny`** to the `Operator` union (`app/types/Mechanic.ts`) and to `operatorEvaluator` (`app/engine/resolvers/operatorEvaluator.ts`): with an array `actual`, return true if it intersects `expected` (case-insensitive for strings). Reusable for any "has one of these keywords" rule.

### 5. The library rule — `hidden.json`

Redefine `app/library/combat-states/hidden.json` (currently a stale `-1 BS` clone):
```json
{
  "name": "Hidden",
  "entity": "thisUnit",
  "effect": "blocksTargeting",
  "value": true,
  "phase": ["shooting"],
  "conditions": [
    { "entity": "thisUnit", "state": "isHidden", "operator": "equals", "value": true },
    { "entity": "thisUnit", "state": "benefitOfCover", "operator": "equals", "value": true },
    { "entity": "thisUnit", "keywords": ["INFANTRY", "SWARM", "BEAST"], "operator": "includesAny", "value": ["INFANTRY", "SWARM", "BEAST"] }
  ]
}
```
All three conditions AND together. `phase: ["shooting"]` — Hidden gates ranged targeting only. Injected by **`collectCoreRuleMechanics`** (`app/engine/collectors/collectCoreRuleMechanics.ts`), tagged `perspective: "defender"` (like cover); the conditions do the gating, so it can be pushed unconditionally.

### 6. Eligibility resolver + result

- **`resolveTargetEligibility(mechanics, context, modifiers)`** (new, `app/engine/resolvers/targetResolver.ts` or a sibling): for each surviving `blocksTargeting` tagged mechanic, resolve its owner via `resolveEntity(entity, context, perspective)` (the defender for Hidden), compute the owner's detection range = `(owner.models[0].detectionRange ?? 15)` adjusted by `modifiers.get("detectionRange")` (staticNumber overrides; else `base + rollBonus − rollPenalty`), and if `context.rangeToTarget != null && rangeToTarget > detectionRange` → return `{ eligible: false, reason: mechanic.name }`. Otherwise `{ eligible: true, reason: null }`. A blank/undefined range is permissive (eligible).
- **`CombatResult.eligibility: { eligible: boolean; reason: string | null }`** (`app/types/CombatResult.ts`).
- **`runCombat`** (`app/engine/pipeline/runCombat.ts`): after `resolveEffects` (so detectionRange modifiers are available), call `resolveTargetEligibility` over the filtered mechanics and include `eligibility` in the returned result. Phases still compute.

### 7. UI

`app/ui/modules/Engagements/Octagon.tsx`:
- Add an **`isHidden`** toggle to `CombatStatePanel` (a `StateBoolRow`, next to Cover).
- Add a **range** text field (engagement-level) feeding `rangeToTarget` into `buildCombatContext`.
- Read `result.eligibility`; when `eligible === false`, render an **invalid-target flag** on the results panel (e.g. a banner "✕ Not a valid target — {reason} beyond detection range") and visually de-emphasise the phase rows.

## Pipeline order

`collect → expand → filterByPhase → filterByConditions → resolveIgnoreStates → filterByTarget → resolveEffects → resolveTargetEligibility → phases`.

## Verification (behaviour to lock in with tests)

Follow TDD; unit-test the new pieces and add a `runCombat` integration test.

1. **`includesAny` operator:** `[A,B]` vs `[B,C]` → true; `[A]` vs `[B,C]` → false; case-insensitive.
2. **`resolveTargetEligibility` unit tests:** a `blocksTargeting` mechanic with `rangeToTarget` 20 vs detectionRange 15 → ineligible (reason "Hidden"); 10 vs 15 → eligible; undefined range → eligible; detectionRange `staticNumber` modifier to 25 makes range 20 eligible.
3. **`runCombat` integration (the scenario):** defender with INFANTRY keyword, `isHidden` + `isInCover` true, `rangeToTarget` 20 → `eligibility.eligible === false`. Then flip each off in turn (not hidden / not in cover / non-matching keyword / range 10) → `eligible === true` each time. Confirms all three gates + the range check.
4. **Phases still resolve** when ineligible (result still has hit/wound/etc.).
5. Full suite green; `tsc` clean apart from the pre-existing `operatorEvaluator` errors.
