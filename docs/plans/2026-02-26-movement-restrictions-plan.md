# Movement Restrictions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Data-driven movement restrictions that filter weapons and block charge in the UI based on movement state, with overrides from weapon attributes (Assault) and unit/leader abilities.

**Architecture:** Movement behaviours define their restrictions in `movement.json`. Behaviour override files declare which combinations they `allow`. A `resolveRestrictions` function checks the current movement state against active behaviours to determine what's permitted. The UI consumes this to filter weapons and display charge restrictions.

**Tech Stack:** TypeScript, Vitest, React (Octagon component)

**Design doc:** `docs/plans/2026-02-26-movement-restrictions-design.md`

---

### Task 1: Create movement behaviour definitions

**Files:**
- Create: `app/library/unit-behaviours/movement.json`

**Step 1: Create the data file**

```json
[
    { "name": "hold" },
    { "name": "move" },
    { "name": "advance", "restricts": ["shoot", "charge"] },
    { "name": "fallBack", "restricts": ["shoot", "charge"] }
]
```

**Step 2: Verify file loads**

Run: `npx tsx -e "import m from './app/library/unit-behaviours/movement.json'; console.log(JSON.stringify(m))"`
Expected: JSON array printed with no errors.

---

### Task 2: Add `allows` field to behaviour override files

**Files:**
- Modify: `app/library/unit-behaviours/advance-and-shoot.json`
- Modify: `app/library/unit-behaviours/advance-and-charge.json`
- Modify: `app/library/unit-behaviours/fall-back-and-shoot.json`
- Modify: `app/library/unit-behaviours/fall-back-and-charge.json`

**Step 1: Update each file**

`advance-and-shoot.json`:
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

`advance-and-charge.json`:
```json
{
    "name": "advance-and-charge",
    "allows": ["advance", "charge"],
    "entity": "thisUnit",
    "effect": "addsAbility",
    "value": true,
    "abilities": ["advanceAndCharge"]
}
```

`fall-back-and-shoot.json`:
```json
{
    "name": "fall-back-and-shoot",
    "allows": ["fallBack", "shoot"],
    "entity": "thisUnit",
    "effect": "addsAbility",
    "value": true,
    "abilities": ["fallBackAndShoot"]
}
```

`fall-back-and-charge.json`:
```json
{
    "name": "fall-back-and-charge",
    "allows": ["fallBack", "charge"],
    "entity": "thisUnit",
    "effect": "addsAbility",
    "value": true,
    "abilities": ["fallBackAndCharge"]
}
```

---

### Task 3: Create types

**Files:**
- Create: `app/types/Behaviour.ts`

**Step 1: Write the types**

```ts
export interface MovementBehaviourDefinition {
    name: string;
    restricts?: string[];
}

export interface BehaviourOverride {
    name: string;
    allows?: string[];
    abilities?: string[];
}
```

---

### Task 4: Create behaviour allows registry

The registry maps camelCase ability names (e.g. `"advanceAndShoot"`) to their `allows` arrays (e.g. `["advance", "shoot"]`). This is the bridge between resolved mechanics and restriction checks.

**Files:**
- Create: `app/engine/utils/behaviourRegistry.ts`
- Create: `app/engine/utils/__tests__/behaviourRegistry.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { getBehaviourAllows } from "../behaviourRegistry";

describe("behaviourRegistry", () => {
    it("returns allows array for advanceAndShoot", () => {
        expect(getBehaviourAllows("advanceAndShoot")).toEqual([
            "advance",
            "shoot",
        ]);
    });

    it("returns allows array for fallBackAndCharge", () => {
        expect(getBehaviourAllows("fallBackAndCharge")).toEqual([
            "fallBack",
            "charge",
        ]);
    });

    it("returns undefined for unknown behaviour", () => {
        expect(getBehaviourAllows("unknownBehaviour")).toBeUndefined();
    });

    it("returns undefined for behaviour without allows", () => {
        expect(getBehaviourAllows("embark")).toBeUndefined();
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run app/engine/utils/__tests__/behaviourRegistry.test.ts`
Expected: FAIL — module not found.

**Step 3: Write the implementation**

```ts
import { BehaviourOverride } from "@/app/types/Behaviour";

import advanceAndShoot from "@/app/library/unit-behaviours/advance-and-shoot.json";
import advanceAndCharge from "@/app/library/unit-behaviours/advance-and-charge.json";
import fallBackAndShoot from "@/app/library/unit-behaviours/fall-back-and-shoot.json";
import fallBackAndCharge from "@/app/library/unit-behaviours/fall-back-and-charge.json";

const behaviourFiles: BehaviourOverride[] = [
    advanceAndShoot as BehaviourOverride,
    advanceAndCharge as BehaviourOverride,
    fallBackAndShoot as BehaviourOverride,
    fallBackAndCharge as BehaviourOverride,
];

const allowsRegistry = new Map<string, string[]>();

for (const behaviour of behaviourFiles) {
    if (!behaviour.allows || !behaviour.abilities) continue;
    for (const ability of behaviour.abilities) {
        allowsRegistry.set(ability, behaviour.allows);
    }
}

export const getBehaviourAllows = (
    abilityName: string,
): string[] | undefined => {
    return allowsRegistry.get(abilityName);
};
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run app/engine/utils/__tests__/behaviourRegistry.test.ts`
Expected: PASS.

---

### Task 5: Create `resolveRestrictions` function

This is the core function. It takes the current movement state and a list of active behaviour ability names, and returns which actions are still restricted.

**Files:**
- Create: `app/engine/resolvers/restrictionResolver.ts`
- Create: `app/engine/resolvers/__tests__/restrictionResolver.test.ts`

**Step 1: Write the failing tests**

```ts
import { describe, it, expect } from "vitest";
import { resolveRestrictions } from "../restrictionResolver";

describe("resolveRestrictions", () => {
    it("returns no restrictions when movement is hold", () => {
        const result = resolveRestrictions("hold", []);
        expect(result).toEqual({ shoot: true, charge: true });
    });

    it("returns no restrictions when movement is move", () => {
        const result = resolveRestrictions("move", []);
        expect(result).toEqual({ shoot: true, charge: true });
    });

    it("returns no restrictions when movement is null", () => {
        const result = resolveRestrictions(null, []);
        expect(result).toEqual({ shoot: true, charge: true });
    });

    it("restricts shoot and charge when advancing with no overrides", () => {
        const result = resolveRestrictions("advance", []);
        expect(result).toEqual({ shoot: false, charge: false });
    });

    it("restricts shoot and charge when falling back with no overrides", () => {
        const result = resolveRestrictions("fallBack", []);
        expect(result).toEqual({ shoot: false, charge: false });
    });

    it("lifts shoot restriction when advancing with advanceAndShoot", () => {
        const result = resolveRestrictions("advance", ["advanceAndShoot"]);
        expect(result).toEqual({ shoot: true, charge: false });
    });

    it("lifts charge restriction when advancing with advanceAndCharge", () => {
        const result = resolveRestrictions("advance", ["advanceAndCharge"]);
        expect(result).toEqual({ shoot: false, charge: true });
    });

    it("lifts both restrictions with multiple behaviours", () => {
        const result = resolveRestrictions("advance", [
            "advanceAndShoot",
            "advanceAndCharge",
        ]);
        expect(result).toEqual({ shoot: true, charge: true });
    });

    it("lifts shoot restriction when falling back with fallBackAndShoot", () => {
        const result = resolveRestrictions("fallBack", [
            "fallBackAndShoot",
        ]);
        expect(result).toEqual({ shoot: true, charge: false });
    });

    it("ignores behaviours that don't match current movement", () => {
        const result = resolveRestrictions("advance", [
            "fallBackAndShoot",
        ]);
        expect(result).toEqual({ shoot: false, charge: false });
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run app/engine/resolvers/__tests__/restrictionResolver.test.ts`
Expected: FAIL — module not found.

**Step 3: Write the implementation**

```ts
import { CombatState } from "@/app/types/State";
import { MovementBehaviourDefinition } from "@/app/types/Behaviour";
import { getBehaviourAllows } from "../utils/behaviourRegistry";
import movementBehaviours from "@/app/library/unit-behaviours/movement.json";

export interface RestrictionResult {
    shoot: boolean;
    charge: boolean;
}

const movements = movementBehaviours as MovementBehaviourDefinition[];

export const resolveRestrictions = (
    movementBehaviour: CombatState["movementBehaviour"],
    activeBehaviours: string[],
): RestrictionResult => {
    const result: RestrictionResult = { shoot: true, charge: true };

    if (!movementBehaviour) return result;

    const movement = movements.find((m) => m.name === movementBehaviour);
    if (!movement?.restricts) return result;

    for (const action of movement.restricts) {
        if (action === "shoot" || action === "charge") {
            result[action] = false;
        }
    }

    for (const behaviourName of activeBehaviours) {
        const allows = getBehaviourAllows(behaviourName);
        if (!allows) continue;
        if (!allows.includes(movementBehaviour)) continue;

        for (const allowed of allows) {
            if (
                (allowed === "shoot" || allowed === "charge") &&
                !result[allowed]
            ) {
                result[allowed] = true;
            }
        }
    }

    return result;
};
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run app/engine/resolvers/__tests__/restrictionResolver.test.ts`
Expected: PASS — all 10 tests.

---

### Task 6: Validation test — `movement.json` names match `CombatState` union

**Files:**
- Create: `app/library/__tests__/movementBehaviours.test.ts`

**Step 1: Write the validation test**

This test asserts that the names in `movement.json` exactly match the non-null values of `CombatState.movementBehaviour`. Since TypeScript unions aren't available at runtime, we define the expected set explicitly and assert both directions.

```ts
import { describe, it, expect } from "vitest";
import movementBehaviours from "@/app/library/unit-behaviours/movement.json";

// These must match CombatState.movementBehaviour union (excluding null).
// If this set changes, update the union in app/types/State.ts.
const EXPECTED_MOVEMENT_NAMES = ["hold", "move", "advance", "fallBack"];

describe("movement.json validity", () => {
    it("contains exactly the expected movement behaviour names", () => {
        const names = movementBehaviours.map(
            (m: { name: string }) => m.name,
        );
        expect(names.sort()).toEqual([...EXPECTED_MOVEMENT_NAMES].sort());
    });

    it("every entry has a string name", () => {
        for (const entry of movementBehaviours) {
            expect(typeof (entry as { name: string }).name).toBe("string");
        }
    });

    it("restricts arrays only contain valid action strings", () => {
        const validActions = ["shoot", "charge"];
        for (const entry of movementBehaviours as {
            name: string;
            restricts?: string[];
        }[]) {
            if (entry.restricts) {
                for (const action of entry.restricts) {
                    expect(validActions).toContain(action);
                }
            }
        }
    });
});
```

**Step 2: Run test to verify it passes**

Run: `npx vitest run app/library/__tests__/movementBehaviours.test.ts`
Expected: PASS.

---

### Task 7: Collect active behaviours for a weapon

A utility that determines which behaviour ability names are active for a given weapon, combining weapon-attribute-level behaviours (like Assault) with unit-level behaviours (from abilities and leaders).

**Files:**
- Create: `app/engine/utils/collectWeaponBehaviours.ts`
- Create: `app/engine/utils/__tests__/collectWeaponBehaviours.test.ts`

**Step 1: Write the failing tests**

```ts
import { describe, it, expect } from "vitest";
import { collectWeaponBehaviours } from "../collectWeaponBehaviours";
import { Mechanic } from "@/app/types/Mechanic";

describe("collectWeaponBehaviours", () => {
    it("returns advanceAndShoot for a weapon with ASSAULT attribute", () => {
        const result = collectWeaponBehaviours(["ASSAULT"], []);
        expect(result).toContain("advanceAndShoot");
    });

    it("returns empty for a weapon with no behaviour attributes", () => {
        const result = collectWeaponBehaviours(["HEAVY", "MELTA 2"], []);
        expect(result).toEqual([]);
    });

    it("includes unit-level behaviours from ability mechanics", () => {
        const mechanics: Mechanic[] = [
            {
                name: "test-ability",
                entity: "thisUnit",
                effect: "addsBehaviour",
                value: true,
                behaviours: ["fallBackAndShoot"],
            },
        ];
        const result = collectWeaponBehaviours([], mechanics);
        expect(result).toContain("fallBackAndShoot");
    });

    it("combines weapon-level and unit-level behaviours", () => {
        const mechanics: Mechanic[] = [
            {
                name: "test-ability",
                entity: "thisUnit",
                effect: "addsBehaviour",
                value: true,
                behaviours: ["advanceAndCharge"],
            },
        ];
        const result = collectWeaponBehaviours(["ASSAULT"], mechanics);
        expect(result).toContain("advanceAndShoot");
        expect(result).toContain("advanceAndCharge");
    });

    it("deduplicates when same behaviour comes from both sources", () => {
        const mechanics: Mechanic[] = [
            {
                name: "redundant",
                entity: "thisUnit",
                effect: "addsBehaviour",
                value: true,
                behaviours: ["advanceAndShoot"],
            },
        ];
        const result = collectWeaponBehaviours(["ASSAULT"], mechanics);
        const count = result.filter((b) => b === "advanceAndShoot").length;
        expect(count).toBe(1);
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run app/engine/utils/__tests__/collectWeaponBehaviours.test.ts`
Expected: FAIL — module not found.

**Step 3: Write the implementation**

This function uses the existing weapon attribute registry to find `addsBehaviour` effects, then combines with unit-level `addsBehaviour` mechanics.

```ts
import { Mechanic } from "@/app/types/Mechanic";
import { parseParameterisedName } from "./parseParameterisedName";

import assault from "@/app/library/weapon-attributes/assault.json";

const weaponBehaviourRegistry: Record<string, string[]> = {};

// Build registry of weapon attribute key → behaviour names
const behaviourAttributes: { key: string; mechanic: Mechanic }[] = [
    { key: "assault", mechanic: assault as unknown as Mechanic },
];

for (const { key, mechanic } of behaviourAttributes) {
    if (mechanic.effect === "addsBehaviour" && mechanic.behaviours) {
        weaponBehaviourRegistry[key] = mechanic.behaviours;
    }
}

export const collectWeaponBehaviours = (
    weaponAttributes: string[],
    unitMechanics: Mechanic[],
): string[] => {
    const behaviours = new Set<string>();

    // Weapon-attribute-level behaviours
    for (const attr of weaponAttributes) {
        const parsed = parseParameterisedName(attr);
        const names = weaponBehaviourRegistry[parsed.key];
        if (names) {
            for (const name of names) behaviours.add(name);
        }
    }

    // Unit-level behaviours from ability mechanics
    for (const mechanic of unitMechanics) {
        if (mechanic.effect === "addsBehaviour" && mechanic.behaviours) {
            for (const name of mechanic.behaviours) behaviours.add(name);
        }
    }

    return [...behaviours];
};
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run app/engine/utils/__tests__/collectWeaponBehaviours.test.ts`
Expected: PASS — all 5 tests.

---

### Task 8: Integrate weapon filtering into Octagon UI

**Files:**
- Modify: `app/ui/modules/Engagements/Octagon.tsx:95-97` (weapon filtering)
- Modify: `app/ui/modules/Engagements/Octagon.tsx:238-251` (weapon selector display)

**Step 1: Add imports**

At the top of `Octagon.tsx`, add:

```ts
import { resolveRestrictions } from "@/app/engine/resolvers/restrictionResolver";
import { collectWeaponBehaviours } from "@/app/engine/utils/collectWeaponBehaviours";
import { Mechanic } from "#types/Mechanic";
```

**Step 2: Collect unit-level behaviour mechanics**

After the `attacker`/`defender` derivation (around line 93), add a memo that extracts `addsBehaviour` mechanics from the attacker's unit and leader abilities:

```ts
const attackerBehaviourMechanics = useMemo<Mechanic[]>(() => {
    if (!attacker) return [];
    return attacker.abilities
        .flatMap((a) => a.mechanics ?? [])
        .filter((m) => m.effect === "addsBehaviour");
}, [attacker]);
```

**Step 3: Compute per-weapon restrictions**

Replace the weapon filtering block (lines 95-97):

```ts
const allWeapons = attacker?.wargear.weapons ?? [];
const weaponTypeFilter = phase === "fight" ? "Melee" : "Ranged";
const weapons = allWeapons.filter((w) => w.type === weaponTypeFilter);
```

with:

```ts
const allWeapons = attacker?.wargear.weapons ?? [];
const weaponTypeFilter = phase === "fight" ? "Melee" : "Ranged";
const movementBehaviour = attacker?.combatState.movementBehaviour ?? null;

const { weapons, weaponRestrictions } = useMemo(() => {
    const typed = allWeapons.filter((w) => w.type === weaponTypeFilter);
    const restrictions = new Map<number, boolean>();

    for (let i = 0; i < typed.length; i++) {
        const weapon = typed[i];
        const attrs = weapon.profiles[0]?.attributes ?? [];
        const behaviours = collectWeaponBehaviours(
            attrs,
            attackerBehaviourMechanics,
        );
        const result = resolveRestrictions(movementBehaviour, behaviours);
        const canUse =
            phase === "fight" ? result.charge : result.shoot;
        restrictions.set(i, canUse);
    }

    return { weapons: typed, weaponRestrictions: restrictions };
}, [allWeapons, weaponTypeFilter, movementBehaviour, attackerBehaviourMechanics, phase]);
```

**Step 4: Update weapon selector to grey out restricted weapons**

In the weapon `<SelectGroup>` (around line 246), update the option rendering:

```tsx
<SelectGroup
    label="Weapon"
    value={weaponIndex}
    onChange={handleWeaponChange}
    placeholder={false}
>
    {weapons.map((w, i) => (
        <option
            key={i}
            value={i}
            disabled={!weaponRestrictions.get(i)}
        >
            {w.name}
            {!weaponRestrictions.get(i) ? " (restricted)" : ""}
        </option>
    ))}
</SelectGroup>
```

**Step 5: Skip combat resolution for restricted weapons**

In the `result` useMemo (around line 117), add a restriction check:

```ts
const result = useMemo<CombatResult | null>(() => {
    if (!attacker || !defender || !selectedProfile || !selectedWeapon)
        return null;

    const isRestricted = weaponRestrictions.get(weaponIndex) === false;
    if (isRestricted) return null;

    // ...rest of existing code
```

**Step 6: Run all tests**

Run: `npm test`
Expected: All existing + new tests pass.

**Step 7: Manual verification**

Run: `npm run dev`
1. Select any attacker, set movement to "advance"
2. Non-Assault ranged weapons should be greyed out with "(restricted)"
3. Select Psychophage, set movement to "advance", select "Talons and betentacled maw" (melee) — should still work (melee isn't restricted by advance in the shooting phase context; fight phase restrictions depend on charge)
4. Select a unit with Assault weapon, set movement to "advance" — Assault weapon should remain selectable
