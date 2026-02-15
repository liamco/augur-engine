# Engine Roadmap

## 1. Behavioural ability resolver — `hasActiveAbility`

Several mechanics use `effect: "addsAbility"` to grant behavioural permissions (e.g. `advanceAndShoot`, `shootInEngagement`, `fightsFirst`). These don't modify dice rolls — they answer yes/no eligibility questions like "can this unit shoot after advancing?"

The engine currently has no way to query these. A generic resolver is needed:

```
hasActiveAbility(unit, context, abilityName) -> boolean
```

**How it works:**
- Collects all mechanics from every hierarchy layer for the given unit (weapon attributes, unit abilities, leader abilities, enhancements, stratagems, etc.)
- Filters to mechanics with `effect: "addsAbility"` or `effect: "addsKeyword"`
- Evaluates each mechanic's conditions against the current combat context
- Returns `true` if any surviving mechanic's `abilities[]` array contains `abilityName`

**Ability names to support:**
- `advanceAndShoot` — from Assault weapon attribute, advance-and-shoot ability, or any higher layer
- `advanceAndCharge` — from advance-and-charge ability
- `fallBackAndShoot` — from fall-back-and-shoot ability
- `fallBackAndCharge` — from fall-back-and-charge ability
- `shootInEngagement` — from Pistol weapon attribute
- `fightsFirst` — from fights-first ability
- `infiltrate` — from infiltrators ability
- `hover` — from hover ability
- `leader` — from leader ability
- `scouts` — from scouts ability

**Key design principle:** The engine doesn't hard-code what any ability name means. The caller (UI, game loop, phase gating logic) decides which ability name to check before allowing an action. The JSON library files remain the single source of truth for which mechanics grant which abilities, and under what conditions.

**Location:** `app/engine/resolvers/abilityResolver.ts`

---

## 2. Parameterised mechanic support

Several weapon attributes and abilities include a numeric parameter in their name:
- `SUSTAINED HITS 2`, `ANTI-INFANTRY 4+`, `MELTA 2`, `RAPID FIRE 1`, `SCOUTS 6"`, `DEADLY DEMISE D3`

The library JSON files use `"$param"` as a placeholder for this value. The engine needs to:

### 2a. Parse parameterised attribute names

Extract the parameter from the attribute string as it appears on the weapon profile:

```
"SUSTAINED HITS 2"    -> { key: "sustained-hits", param: 2 }
"ANTI-INFANTRY 4+"    -> { key: "anti", param: 4, keyword: "INFANTRY" }
"MELTA 2"             -> { key: "melta", param: 2 }
"RAPID FIRE 1"        -> { key: "rapid-fire", param: 1 }
```

Anti-X is the most complex — it encodes both a keyword and a roll threshold.

**Location:** Extend `collectWeaponMechanics.ts` with a `parseParameterisedAttribute` function.

### 2b. Replace placeholders in mechanic templates

When a parameterised attribute is matched, deep-clone the library JSON mechanic and replace all `"$param"` values with the parsed number. For Anti-X, also replace `"$keyword"`.

Melta and Rapid Fire also use `"$halfRange"` in their conditions — this needs to be computed from `weaponProfile.range / 2` at collection time.

### 2c. Affected library files

- `app/library/weapon-attributes/anti.json` — `$param`, `$keyword`
- `app/library/weapon-attributes/melta.json` — `$param`, `$halfRange`
- `app/library/weapon-attributes/rapid-fire.json` — `$param`, `$halfRange`
- `app/library/weapon-attributes/sustained-hits.json` — `$param`
- `app/library/unit-abilities/deadly-demise.json` — `$param`
- `app/library/unit-abilities/scouts.json` — `$param`

---

## 3. Critical hit mechanics

Sustained Hits, Lethal Hits, and Devastating Wounds all trigger on an unmodified roll of 6 (a critical hit). They are not simple roll modifiers — they create additional effects on specific die results:

- **Sustained Hits X:** Each critical hit scores X additional hits
- **Lethal Hits:** Critical hits automatically wound (skip wound roll)
- **Devastating Wounds:** Critical wounds inflict mortal wounds instead of normal damage

The current architecture models these as standard mechanics, but the combat phase resolvers need special handling for critical results. The hit and wound phase resolvers should track whether critical-hit-triggered mechanics (Sustained Hits, Lethal Hits, Devastating Wounds) are active, so the engine can apply them when an actual roll of 6 occurs.

---

## 4. `ratioOf` operator in phase resolvers

The Blast mechanic uses `ratioOf` with value 5, meaning "+1 attack for every 5 models in the target unit." The condition evaluator currently returns `true` if the actual value is > 0, but the phase resolver also needs to compute the dynamic bonus: `Math.floor(targetModels / ratioValue)`. This requires `resolveAttackCount` to read the condition's ratio value and compute the bonus, rather than just reading a flat `rollBonus`.

---

## 5. Multiple weapon profile aggregation

The engine currently processes one weapon profile at a time via `runCombat`. Units with mixed weapons (e.g. a squad where the sergeant has a different gun) require calling `runCombat` once per weapon profile and aggregating the results. A convenience function could handle this:

```
runCombatForUnit(attacker, defender, weaponProfiles[]) -> AggregatedCombatResult
```

---

## 6. Type cleanup

- `TestUnit` in `Test.ts` is the real working type; `Unit` in `Unit.ts` is an older draft that doesn't match the parsed data. Consider renaming `TestUnit` to `Unit` and removing the old type.
- `Test.ts` redeclares `Entity`, `Effect`, `Attribute`, `Operator` locally instead of importing from `Mechanic.ts`. These duplicates should be removed.

---

## 7. Datasheet parser

A parser that takes source JSON files and transforms them into the fully-resolved datasheet format the engine expects. This includes resolving parameterised mechanics for all entity types (weapon attributes and unit abilities) at build time, so the engine collectors receive concrete values rather than placeholder templates.

To be fleshed out once additional example datasheets are provided covering various combinations of parameterised weapon attributes and unit abilities.

---

## 8. Command phase player choices

Certain army rules and detachment abilities require the player to make a selection during the Command Phase that affects combat for the rest of the turn. The engine currently has no concept of player-driven choices or turn-scoped state that results from them.

**Examples:**
- **Oath of Moment** (Space Marines army rule) — the player selects an enemy unit; all attacks against that unit gain full hit re-rolls for the turn
- Detachment abilities that let the player pick a friendly unit to receive a buff, or an enemy unit to receive a debuff

**What's missing:**
- No mechanism for defining that an ability requires a player choice (e.g. "select one enemy unit")
- No way to represent the result of that choice as turn-scoped state on the selected unit (e.g. "this unit is the Oath of Moment target")
- No way for mechanic conditions to reference that state (e.g. `"state": "isOathTarget"` on the defender)
- No modelling of when these choices happen (Command Phase) or how long they last (until next Command Phase)

**Design questions to explore:**
- How should army/detachment abilities declare that they offer a choice? A new effect type? A separate schema for "command phase actions"?
- Where does the choice result live — on the selected unit's `combatState`, in a turn-level game state, or somewhere else?
- How do mechanic conditions reference the choice outcome? Does `customState` on `CombatState` already cover this, or is a more structured approach needed?
- Should the engine be responsible for presenting choices to the caller, or should the caller resolve choices externally and pass the result into `CombatContext`?
- How do multi-turn effects and choice expiry get tracked?
