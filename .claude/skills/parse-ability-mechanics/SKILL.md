---
name: parse-ability-mechanics
description: Use when converting 40k datasheet abilities, detachment abilities or Enhancements from rules text into engine mechanics, when rules show "mechanicsSource": "unparsed" in the codex, or when a parse reports STEP 4 PENDING
---

# Parse Ability Mechanics

## Overview

Final step of a single pipeline that takes source data through to engine-ready output:

1. `npm run fetch` — Wahapedia CSVs into `data/src`
2. `npm run parse` — structure, trim redundant fields, strip HTML, write `app/codex`
3. regex extraction — runs *inside* parse, covers ~34% of datasheet abilities, 48% of detachment abilities, 28% of Enhancements
4. **this skill** — everything the regex declined

You edit the codex **in place**, so that when you finish it is 100% engine-ready with no side files and no second source of truth.

## Three kinds of rule, three places to edit

| rule | file | engine reads it via |
|---|---|---|
| datasheet ability | `app/codex/factions/*/datasheets/*.json` → `abilities[]` | `collectUnitMechanics` |
| wargear ability | `app/codex/factions/*/datasheets/*.json` → `wargear.abilities[]` | `collectWargearMechanics` |
| detachment ability | `app/codex/factions/*/detachments/*.json` → `abilities[]` | `collectDetachmentMechanics` |
| Enhancement | `app/codex/factions/*/detachments/*.json` → `enhancements[]` | `collectEnhancementMechanics` |

**Wargear abilities are bearer-scoped**, like Enhancements: a storm shield is carried by one model. Apply the same single-model gate (below). Their ids are also what a loadout reference resolves to, so never change an `id`.

**After editing any detachment file, run `npm run reindex-detachments`.** The app reads detachments through the generated `app/codex/detachment-index.json`, so an edit that skips the reindex never reaches the engine. It re-derives the index from the codex, so it is safe to run any time — on an unmodified codex it is a no-op.

**Re-running `npm run parse` destroys your work.** It rewrites every datasheet and detachment file and resets every rule to `regex`/`unparsed`. That is a deliberate trade: one artefact, nothing hand-authored to drift out of sync. Consequence — run this skill *after* a parse, and expect to re-run it after any fetch or parse.

**Core principle: triage before extraction.** Most of what's left is not a combat mechanic at all. Deciding *whether* an ability belongs in the `Mechanic` format is the larger part of the job; forcing an army-construction rule or a multi-step dice procedure into it produces data that looks populated and does nothing — or silently changes damage maths.

The engine reads `mechanics` straight into combat resolution with **no validation of its own** (`app/engine/collectors/collectUnitMechanics.ts`). Wrong is worse than absent.

## Three verdicts

Set `mechanicsSource` on every rule you touch:

| `mechanicsSource` | when | `mechanics` |
|---|---|---|
| `skill` | a combat modifier the `Mechanic` type can express | populated |
| `outOfScope` | not combat resolution — army construction, deployment, transports, scoring | `[]` |
| `needsSchema` | genuinely combat, but `Mechanic` can't express it | `[]` |

From the real corpus:

- `skill` — *"Each time this model makes a ranged attack that targets a unit that cannot Fly, add 1 to the Hit roll."*
- `outOfScope` — *"This model cannot be your Warlord."* / *"This model cannot be given Enhancements."*
- `needsSchema` — *"…roll one D6. On a 4+, do not remove it from play; that model can fight after…"* (roll, branch, resurrect)

When torn between `skill` and `needsSchema`, choose `needsSchema`. A recorded gap is useful; a wrong mechanic is not.

## What you edit

Find abilities with `"mechanicsSource": "unparsed"` and replace both fields in place:

```json
{
    "name": "Strafing Run",
    "description": "Each time this model makes a ranged attack that targets a unit that cannot Fly, add 1 to the Hit roll.",
    "type": "Datasheet",
    "parameter": null,
    "mechanics": [
        {
            "name": "Strafing Run",
            "entity": "thisUnit",
            "effect": "rollBonus",
            "attribute": "hit",
            "value": 1,
            "phase": ["shooting"],
            "conditions": [
                { "entity": "targetUnit", "keywords": ["FLY"], "operator": "notIncludes", "value": true }
            ]
        }
    ],
    "mechanicsSource": "skill"
}
```

**The same rules text appears on several datasheets.** Editing one file fixes one unit. Search by description across `app/codex/factions/*/datasheets/` and update every occurrence, or the ability will behave differently between units. 47 `(faction, name)` pairs also share a name while differing in text — match on `description`, never `name` alone.

## Required steps

1. **Get the queue.** Run `npm run coverage-report` and read `.claude/coverage/` — one report per category, listing every rule still lacking mechanics, grouped by rules text and ordered so the entry at the top affects the most files. Prefer this to grepping for `"mechanicsSource": "unparsed"`: the reports fold repeats together, so 786 unit abilities become 469 distinct texts, and each entry already names every file to edit.
2. **Read the vocabulary.** `app/types/Mechanic.ts` is the only authority for `effect`, `entity`, `attribute` and `operator`. Do not invent members. Then check the attribute is one the engine consumes (below).
3. **Check the library first.** If the rule grants an existing one, emit `addsAbility` / `addsWeaponAttribute` naming it — the rule's own mechanics live in `app/library/`. Don't restate its effects.
4. **Edit every occurrence** of that description. Datasheet abilities repeat across datasheets; Enhancements repeat across detachments.
5. **Reindex, if you touched a detachment file.** `npm run reindex-detachments`.
6. **Validate.** `npm run validate-mechanics` — checks every mechanic in datasheets, detachment abilities and Enhancements against the type, and that each `mechanicsSource` agrees with whether mechanics are present. Exits non-zero on any problem.

Never report work complete without a clean validate.

## Getting `entity` right

The most common way to produce a mechanic that silently does nothing.

`hit`, `wound`, `strength`, `armourPenetration`, `damage`, `attacks` are **attacker-owned**; `save`, `toughness`, `invulnSave`, `feelNoPain` are **defender-owned** (`app/engine/resolvers/targetResolver.ts`). A mechanic applies only if its `entity` resolves to the side that owns the attribute.

- *"each time a model in this unit makes an attack, add 1 to the Hit roll"* → `thisUnit` + `hit`
- *"each time an attack targets this unit, subtract 1 from the Hit roll"* → `opposingUnit` + `hit`

Use `thisUnit` for the second and `filterByTarget` drops it — the rule does nothing, with no error.

## Only these attributes do anything

An attribute being in `app/types/Mechanic.ts` means a mechanic is *well-formed*. It does not mean a resolver reads it. These are the ones combat actually consumes (`ENGINE_CONSUMED_ATTRIBUTES` in `data/pipeline/transforms/abilityMechanics/validate.ts`):

```
hit  wound  save  ballisticSkill  weaponSkill  strength  toughness
armourPenetration  invulnSave  attacks  damage  feelNoPain  detectionRange
```

`wounds`, `movement`, `leadership`, `objectiveControl`, `range` and `distanceToTarget` are valid to write but **no resolver reads them** — a mechanic targeting one is inert. If a rule's whole effect is one of those, it is `needsSchema`, not `skill`.

## Effects the engine cannot scope

Nothing tracks *where damage came from* or *how long a rule lasts*. If the text limits the effect to a subset of attacks or a window of time, and you cannot express that with `phase` or a `condition`, it is `needsSchema`:

- "Feel No Pain 4+ **against Psychic Attacks**" / "**against mortal wounds**" — extracted flat this grants the save against everything
- "**Until the end of the phase**…", "**Once per battle**…"
- "**On a Critical Wound**, improve the Armour Penetration characteristic" — there is no post-crit trigger
- "**While within 6"** of this model…" — no aura ranges

The regex layer already declines these (`hasUnexpressedScope` in `data/pipeline/transforms/abilityMechanics/guards.ts`); don't reintroduce them by hand.

## Setting a characteristic vs adding to it

| rules text | effect |
|---|---|
| "has a Save characteristic of 2+", "has a 4+ invulnerable save" | `setsCharacteristic` — replaces the datasheet value |
| "add 1 to the Toughness characteristic", "add 3 to the Strength characteristic" | `staticNumber` — sums, uncapped |
| "add 1 to the Hit roll" | `rollBonus` — **clamped to 1** by `effectResolver` |

Using `staticNumber` where the text says *has* turns a 4++ invulnerable save into one 4 worse. Using `rollBonus` for a characteristic silently truncates "add 3" to "add 1".

## Enhancements: the bearer is one model

An Enhancement is worn by a single CHARACTER model — the **bearer** — but the engine has no model-level scoping: `entityResolver` resolves `thisModel` and `thisUnit` through the same branch, so a mechanic for the bearer reaches every model in its unit.

Read which the rules text means, and gate accordingly:

| text | emit |
|---|---|
| "models in the bearer's unit…", "While the bearer is leading a unit, models in that unit…" | `thisUnit`, no extra condition |
| "The bearer has…", "…characteristics of the bearer", "the bearer's melee weapons" | `thisUnit` **plus** the single-model condition below |
| both in one description | `needsSchema` — split scope cannot be expressed |

```json
{ "entity": "thisUnit", "state": "startingModelCount", "operator": "equals", "value": 1 }
```

That makes a bearer-only buff correct for a single-model character and correctly inactive when the character leads a bodyguard unit — it under-applies rather than buffing four models that never had the Enhancement. `startingModelCount`, not `modelCount`: a squad reduced to one survivor must not acquire it.

Note the regex layer already does this (`data/pipeline/transforms/abilityMechanics/bearerScope.ts`); follow the same convention so the two agree.

## Common mistakes

| Mistake | Consequence |
|---|---|
| Running `npm run parse` after this skill | All your work is erased |
| Editing a detachment file without `npm run reindex-detachments` | The app reads the stale index; your edit never reaches the engine |
| Editing one file when the description appears on several | The rule works on some units and not others |
| Matching abilities by `name` | 47 name collisions; applies one unit's rule to another's |
| Inventing an `effect` or `attribute` | Validator rejects it; if it slipped through, the mechanic is inert |
| Using an attribute no resolver reads (`wounds`, `movement`, `leadership`) | Well-formed, validates, does nothing |
| `staticNumber` where the text says "has a 4+ invulnerable save" | Adds 4 to the save instead of setting it |
| `rollBonus` for "add 3 to the Strength characteristic" | Clamped to +1 |
| Emitting a bearer-only effect without the single-model condition | Buffs every model in the unit, not just the one wearing it |
| Naming a library ability that doesn't exist | `expandAbilityMechanics` finds no template, mechanic does nothing |
| Dropping a condition ("while leading", "within 6\"") | Bonus applies permanently and unconditionally |
| Leaving `mechanicsSource` as `unparsed` after adding mechanics | Validator rejects the mismatch |
| Marking a procedural rule `skill` | Emits a fragment that misrepresents the rule |

## Red flags — stop

- "I'll approximate the dice roll as a flat bonus"
- "This is close enough to a modifier"
- "The condition probably doesn't matter"
- "I'll validate at the end" (validate before claiming any batch is done)
- Reaching for an `effect` not in `app/types/Mechanic.ts`

Each means: `needsSchema`, and record why.
