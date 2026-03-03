# Movement Restrictions Design

## Problem

By default, units cannot shoot or charge after advancing or falling back. Certain weapon attributes (e.g. Assault) and unit abilities (e.g. a leader granting fall-back-and-charge) can override these restrictions. The engine currently has no enforcement layer for this — `movementBehaviour` exists on `CombatState` and abilities like Assault emit `addsBehaviour`, but nothing consumes this data to gate combat actions.

## Approach

Data-driven. Movement behaviours are defined in JSON with their default restrictions. Override abilities declare which combinations they allow. The engine resolves active restrictions by checking whether any resolved behaviour permits the movement + action combination. No hardcoded restriction logic in the engine.

## Data Layer

### Movement behaviour definitions

New file: `app/library/unit-behaviours/movement.json`

```json
[
    { "name": "hold" },
    { "name": "move" },
    { "name": "advance", "restricts": ["shoot", "charge"] },
    { "name": "fallBack", "restricts": ["shoot", "charge"] }
]
```

Each entry defines a movement behaviour and the actions it restricts by default. `hold` and `move` have no restrictions.

### Override abilities

The 4 existing behaviour files that act as restriction overrides get a new `allows` field:

| File | `allows` |
|---|---|
| `advance-and-shoot.json` | `["advance", "shoot"]` |
| `advance-and-charge.json` | `["advance", "charge"]` |
| `fall-back-and-shoot.json` | `["fallBack", "shoot"]` |
| `fall-back-and-charge.json` | `["fallBack", "charge"]` |

Example:

```json
{
    "name": "advance-and-shoot",
    "allows": ["advance", "shoot"],
    "entity": "thisUnit",
    "effect": "addsAbility",
    "value": true,
    "abilities": ["advanceAndShoot"]
}
```

The `allows` array means "any combination of these items is permitted." If a future ability allowed `["advance", "shoot", "charge"]`, it would lift both the shoot and charge restrictions when advancing.

The remaining 5 behaviour files (embark, disembark, disembark-and-advance, disembark-and-charge, shoot-while-engaged) are unchanged — no `allows` field.

### Weapon attribute (Assault)

`assault.json` currently emits `addsBehaviour` with `behaviours: ["advanceAndShoot"]`. When the engine resolves this, it looks up the `advance-and-shoot` behaviour and finds its `allows: ["advance", "shoot"]`, which lifts the shoot restriction for that specific weapon.

## Types

New interfaces for the JSON shapes:

```ts
interface MovementBehaviourDefinition {
    name: string;
    restricts?: string[];
}

interface BehaviourOverride {
    name: string;
    allows?: string[];
    // ...existing mechanic fields
}
```

`CombatState.movementBehaviour` retains its typed union (`"hold" | "move" | "advance" | "fallBack" | null`). A validation test asserts the names in `movement.json` match the union values.

## Engine

New function `resolveRestrictions`:

1. Load `movement.json`, find the entry matching `combatState.movementBehaviour`
2. Get its `restricts` array (e.g. `["shoot", "charge"]`)
3. Collect all resolved behaviours/abilities from unit abilities, leader abilities, and weapon attributes
4. For each restriction, check if any resolved behaviour's `allows` array contains **both** the current movement name **and** the restricted action
5. Return the set of still-active restrictions

For **weapon-level** overrides (Assault): the check is per-weapon — "does this weapon's resolved attributes grant a behaviour that allows this combination?"

For **unit-level** overrides (leader abilities, etc.): the check applies to all weapons.

## UI

`Octagon` component:

1. Calls `resolveRestrictions` with the current combat state and resolved mechanics
2. Filters the weapon list — weapons that can't be used under the current movement state are greyed out or hidden
3. Shows a charge restriction indicator if charge is still restricted
4. Engine (`runCombat`) is not called for restricted weapons — purely UI-driven filtering

## Tests

- Validation test: `movement.json` names match the `CombatState.movementBehaviour` union values
- Unit tests for `resolveRestrictions` covering:
  - No restrictions when hold/move
  - Shoot and charge restricted when advancing (no overrides)
  - Assault weapon lifts shoot restriction when advancing
  - Unit ability lifts charge restriction when falling back
  - Multiple overrides stacking correctly

## Existing code impact

Minimal:
- `stateResolver.ts` — no changes, just passes through `movementBehaviour` value
- `heavy.json` / `lance.json` — no changes, conditions against state values still work
- `CombatState` type — no changes to the union
