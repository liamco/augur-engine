---
name: parse-ability-mechanics
description: Use when converting 40k datasheet ability rules text into engine mechanics, when abilities show "mechanicsSource": "unparsed" in the codex, or when a parse reports STEP 4 PENDING
---

# Parse Ability Mechanics

## Overview

Final step of a single pipeline that takes source data through to engine-ready output:

1. `npm run fetch` — Wahapedia CSVs into `data/src`
2. `npm run parse` — structure, trim redundant fields, strip HTML, write `app/codex`
3. regex extraction — runs *inside* parse, covers ~32% of datasheet abilities
4. **this skill** — the abilities regex declined

You edit `app/codex/**/datasheets/*.json` **in place**, so that when you finish the codex is 100% engine-ready with no side files and no second source of truth.

**Re-running `npm run parse` destroys your work.** It rewrites all 420 datasheet files and resets every ability to `regex`/`unparsed`. That is a deliberate trade: one artefact, nothing hand-authored to drift out of sync. Consequence — run this skill *after* a parse, and expect to re-run it after any fetch or parse.

**Core principle: triage before extraction.** Most of what's left is not a combat mechanic at all. Deciding *whether* an ability belongs in the `Mechanic` format is the larger part of the job; forcing an army-construction rule or a multi-step dice procedure into it produces data that looks populated and does nothing — or silently changes damage maths.

The engine reads `ability.mechanics` straight into combat resolution with **no validation of its own** (`app/engine/collectors/collectUnitMechanics.ts`). Wrong is worse than absent.

## Three verdicts

Set `mechanicsSource` on every ability you touch:

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

1. **Get the queue.** Abilities with `"mechanicsSource": "unparsed"`.
2. **Read the vocabulary.** `app/types/Mechanic.ts` is the only authority for `effect`, `entity`, `attribute` and `operator`. Do not invent members.
3. **Check the library first.** If the ability grants an existing rule, emit `addsAbility` / `addsWeaponAttribute` naming it — the rule's own mechanics live in `app/library/`. Don't restate its effects.
4. **Edit every occurrence** of that description across the faction's datasheets.
5. **Validate.** `npm run validate-mechanics` — checks every mechanic against the type, and that each `mechanicsSource` agrees with whether mechanics are present. Exits non-zero on any problem.

Never report work complete without a clean validate.

## Getting `entity` right

The most common way to produce a mechanic that silently does nothing.

`hit`, `wound`, `strength`, `armourPenetration`, `damage`, `attacks` are **attacker-owned**; `save`, `toughness`, `invulnSave`, `feelNoPain` are **defender-owned** (`app/engine/resolvers/targetResolver.ts`). A mechanic applies only if its `entity` resolves to the side that owns the attribute.

- *"each time a model in this unit makes an attack, add 1 to the Hit roll"* → `thisUnit` + `hit`
- *"each time an attack targets this unit, subtract 1 from the Hit roll"* → `opposingUnit` + `hit`

Use `thisUnit` for the second and `filterByTarget` drops it — the rule does nothing, with no error.

## Common mistakes

| Mistake | Consequence |
|---|---|
| Running `npm run parse` after this skill | All your work is erased |
| Editing one file when the description appears on several | The ability works on some units and not others |
| Matching abilities by `name` | 47 name collisions; applies one unit's rule to another's |
| Inventing an `effect` or `attribute` | Validator rejects it; if it slipped through, the mechanic is inert |
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
