# Design: Datasheet pipeline — basics (source → codex, authoritative)

**Date:** 2026-07-30
**Status:** Approved (design), pending implementation plan

## Context / Problem

`app/codex/*.json` (the app-consumed unit data) is a mix of hand-curated/legacy files. We want the `data/pipeline` conversion (source `data/src` → `app/codex`) to be the **single authoritative source of truth** for the *basic structural* datasheet content, eliminating hand-authored data.

The existing pipeline already produces most basics (metadata restructure, models, keywords, wargear profiles, leader, costs, ability shells, core-stratagem extraction) and already handles the shared-objects concern: **core stratagems are extracted to a shared `core-stratagems.json`**, and **Core/Faction abilities are reduced to `{name, type, parameter?}` shells** (descriptions not repeated — their rules live in the library). Only **Datasheet** (bespoke) abilities keep a description.

This round makes that pipeline **reliable and authoritative** for the basics. Loadout parsing, mechanics derivation, and `combatState` are explicitly out of scope.

## Decisions (agreed)

- **A (output contract): (a)** — the app consumes the pipeline's nested output directly (`app/codex/factions/{slug}/datasheets/{id}.json`); the hand-curated flat `app/codex/{slug}.json` files are deleted. Pipeline is authoritative. **A combat regression is accepted** (generated files have no `mechanics`, so bespoke-rule resolution stops working until the mechanics step).
- **B (combatState): out of scope.** `combatState` is runtime-only; the pipeline does not emit it and we do not build runtime initialisation here. (The lab's combat will be non-functional until a later runtime-combatState + mechanics step — accepted.)

## Goals

- The pipeline runs cleanly across **all three factions** (space-marines, tyranids, necrons) and produces correct basic structure with no `NaN`/crashes.
- Its output for a known unit **structurally matches the codex example** (WTP) minus loadouts / mechanics / combatState.
- The app's data source is the pipeline output; no hand-authored unit data remains.

## Non-goals / Deferred (explicit)

- **Loadout parsing** (`defaultLoadout.parsed`, `byModelType`, `validLoadouts`, `loadoutsParsed`) — next step.
- **Mechanics derivation** (`ability.mechanics`, `mechanicsSource`) — next step; the library is the store for common-ability rules.
- **`combatState`** — runtime concern; a later `createDefaultCombatState`-at-load step will restore lab combat.
- Restoring full combat in the lab (depends on the two above).

## Design

### 1. Harden the transforms (reliability)

- **`transformModels`** — guard numeric parsing for `t`, `w`, `oc` the same way `m`/`sv`/`ld` are guarded (a `-`/`""` must not yield `NaN`; use `null` or a documented default).
- **`transformCosts`** — guard `parseInt(cost)` against non-numeric.
- **`transformDetachments`** — do not assume `det.abilities[0]` exists (empty → handle gracefully); do not silently discard detachment abilities beyond the first.
- **`restructureTopLevel`** — populate `supplement.slug`/`supplement.name` from the source (`supplementKey`/`supplementLabel`) instead of hardcoded blanks.
- Ensure `index.ts` walks every faction folder and writes without error; skip the `tyranids_old/` duplicate (leave a note for manual cleanup).

### 2. Validate output against the codex shape

- Add a validation pass/test that, for a representative unit (WTP), asserts the pipeline output matches the codex example **structurally** — same keys and value shapes for: `id, name, slug, legend, faction, source, role, isForgeWorld, isLegends, leader, keywords, transport, damaged, wargear (profiles), supplement, models, pointsCosts, abilities (shells)` — **excluding** the deferred `combatState`, `mechanics`, and parsed-loadout fields.
- Extend `validateOutput.ts` (currently opt-in/untested) to cover the basic required fields, and add a test for it.

### 3. Regenerate all faction datasheets

- Run `npm run parse` to (re)generate `app/codex/factions/{slug}/datasheets/{id}.json`, `faction.json`, and `app/codex/core-stratagems.json` for all factions. This is now the authoritative codex content.

### 4. Make the app authoritative on pipeline output (Decision A(a))

- Repoint `app/ui/modules/Engagements/unitManifest.ts` to import the pipeline's **nested** datasheet files (`#codex/factions/{slug}/datasheets/{id}.json`) for the manifest's units, replacing the flat-file imports.
- **Delete** the hand-curated flat `app/codex/{slug}.json` files (winged-tyranid-prime, gargoyles, termagants, psychophage, heavy-intercessor-squad, infernus-squad, librarian-in-terminator-armour). `core-stratagems.json` stays (pipeline-generated); `exampleStructure.json` — delete if unused.
- Update the `runCombat.*.test.ts` fixtures that import the deleted flat files to import from the nested pipeline files (or inline minimal fixtures).

## Verification

- **Pipeline runs clean:** `npm run parse` completes for all factions with no errors/`NaN` in output (spot-check `t`/`w`/`oc`/`cost` on a unit with a `-` stat).
- **Transform unit tests** (extend existing `data/pipeline/transforms/__tests__`): guarded parsing returns the documented default (not `NaN`) for `-`/empty; detachment with 0/2+ abilities handled; supplement fields populated.
- **Structural parity test:** pipeline output for WTP matches the codex example on the in-scope keys (deferred fields excluded).
- **App + suite:** the app still *loads* the manifest from pipeline output; `npx vitest run` passes for everything except the **accepted, documented** combat regressions (any test asserting bespoke-mechanic behaviour that now has no mechanics is updated/skipped with a clear note pointing to the mechanics follow-up). `tsc` clean apart from the pre-existing `operatorEvaluator` errors.

## Follow-ups (tracked, not this round)

1. Loadout parsing in the pipeline.
2. Mechanics layer — reliable regex patterns + library wiring for common abilities; bespoke via a tagged authored step.
3. `createDefaultCombatState(unit)` at runtime + restoring lab combat.
