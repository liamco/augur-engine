# Parameterised Mechanic Support — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Parse parameterised weapon attribute names (e.g. `"ANTI-INFANTRY 4+"`, `"SUSTAINED HITS 2"`) and hydrate library JSON templates with concrete values at collection time.

**Architecture:** Two shared utilities (`parseParameterisedName`, `hydrateMechanic`) handle all parsing and placeholder replacement. The existing collectors (`collectWeaponMechanics`, `expandWeaponAttributeMechanics`) call these utilities instead of doing simple string matching. All placeholders are resolved at collection time.

**Tech Stack:** TypeScript, Next.js (path alias `@/*`), Vitest (to be added)

---

### Task 1: Set up Vitest

No test framework exists in the project. Add Vitest so all subsequent tasks can follow TDD.

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

**Step 1: Install vitest**

Run: `npm install --save-dev vitest`

**Step 2: Create vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
    test: {
        globals: true,
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "."),
        },
    },
});
```

This mirrors the `@/*` path alias from `tsconfig.json` so imports like `@/app/types/Mechanic` resolve correctly in tests.

**Step 3: Add test script to package.json**

Add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

**Step 4: Verify vitest runs**

Run: `npm test`
Expected: Vitest runs and reports "no test files found" (no tests exist yet).

**Step 5: Commit**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "Add vitest for engine unit testing"
```

---

### Task 2: `parseParameterisedName` — tests

Write all tests first before any implementation.

**Files:**
- Create: `app/engine/utils/__tests__/parseParameterisedName.test.ts`

**Step 1: Write the tests**

Create `app/engine/utils/__tests__/parseParameterisedName.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseParameterisedName } from "../parseParameterisedName";

describe("parseParameterisedName", () => {
    it("parses a plain attribute with no parameter", () => {
        expect(parseParameterisedName("ASSAULT")).toEqual({
            key: "assault",
        });
    });

    it("parses a multi-word attribute with no parameter", () => {
        expect(parseParameterisedName("IGNORES COVER")).toEqual({
            key: "ignores-cover",
        });
    });

    it("parses a multi-word attribute with a trailing number", () => {
        expect(parseParameterisedName("SUSTAINED HITS 2")).toEqual({
            key: "sustained-hits",
            param: 2,
        });
    });

    it("parses a single-word attribute with a trailing number", () => {
        expect(parseParameterisedName("MELTA 2")).toEqual({
            key: "melta",
            param: 2,
        });
    });

    it("parses RAPID FIRE with a parameter", () => {
        expect(parseParameterisedName("RAPID FIRE 1")).toEqual({
            key: "rapid-fire",
            param: 1,
        });
    });

    it("parses ANTI-INFANTRY with keyword and roll threshold", () => {
        expect(parseParameterisedName("ANTI-INFANTRY 4+")).toEqual({
            key: "anti",
            param: 4,
            keyword: "INFANTRY",
        });
    });

    it("parses ANTI-PSYKER with keyword and roll threshold", () => {
        expect(parseParameterisedName("ANTI-PSYKER 4+")).toEqual({
            key: "anti",
            param: 4,
            keyword: "PSYKER",
        });
    });

    it("parses ANTI-MONSTER with keyword and roll threshold", () => {
        expect(parseParameterisedName("ANTI-MONSTER 4+")).toEqual({
            key: "anti",
            param: 4,
            keyword: "MONSTER",
        });
    });

    it("parses ANTI-VEHICLE with a different threshold", () => {
        expect(parseParameterisedName("ANTI-VEHICLE 3+")).toEqual({
            key: "anti",
            param: 3,
            keyword: "VEHICLE",
        });
    });

    it("parses TWIN-LINKED as a plain hyphenated attribute", () => {
        expect(parseParameterisedName("TWIN-LINKED")).toEqual({
            key: "twin-linked",
        });
    });

    it("parses LETHAL HITS as a plain multi-word attribute", () => {
        expect(parseParameterisedName("LETHAL HITS")).toEqual({
            key: "lethal-hits",
        });
    });

    it("parses DEVASTATING WOUNDS as a plain multi-word attribute", () => {
        expect(parseParameterisedName("DEVASTATING WOUNDS")).toEqual({
            key: "devastating-wounds",
        });
    });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- app/engine/utils/__tests__/parseParameterisedName.test.ts`
Expected: FAIL — cannot find module `../parseParameterisedName`

**Step 3: Commit**

```bash
git add app/engine/utils/__tests__/parseParameterisedName.test.ts
git commit -m "Add failing tests for parseParameterisedName"
```

---

### Task 3: `parseParameterisedName` — implementation

**Files:**
- Create: `app/engine/utils/parseParameterisedName.ts`

**Step 1: Implement the parser**

Create `app/engine/utils/parseParameterisedName.ts`:

```ts
export interface ParsedAttribute {
    key: string;
    param?: number;
    keyword?: string;
}

/**
 * Parses a weapon attribute name string into a lookup key,
 * optional numeric parameter, and optional keyword.
 *
 * "ANTI-INFANTRY 4+"  → { key: "anti", param: 4, keyword: "INFANTRY" }
 * "SUSTAINED HITS 2"  → { key: "sustained-hits", param: 2 }
 * "ASSAULT"           → { key: "assault" }
 */
export const parseParameterisedName = (raw: string): ParsedAttribute => {
    const trimmed = raw.trim();

    // Anti pattern: ANTI-<KEYWORD> <N>+
    const antiMatch = trimmed.match(/^ANTI-(\w+)\s+(\d+)\+?$/i);
    if (antiMatch) {
        return {
            key: "anti",
            param: parseInt(antiMatch[2]),
            keyword: antiMatch[1].toUpperCase(),
        };
    }

    // Trailing number: <NAME> <N> or <NAME> <N>+
    const paramMatch = trimmed.match(/^(.+?)\s+(\d+)\+?$/);
    if (paramMatch) {
        const name = paramMatch[1].trim();
        return {
            key: name.toLowerCase().replace(/\s+/g, "-"),
            param: parseInt(paramMatch[2]),
        };
    }

    // No parameter
    return {
        key: trimmed.toLowerCase().replace(/\s+/g, "-"),
    };
};
```

**Step 2: Run tests to verify they pass**

Run: `npm test -- app/engine/utils/__tests__/parseParameterisedName.test.ts`
Expected: All 12 tests PASS

**Step 3: Commit**

```bash
git add app/engine/utils/parseParameterisedName.ts
git commit -m "Implement parseParameterisedName utility"
```

---

### Task 4: `hydrateMechanic` — tests

**Files:**
- Create: `app/engine/utils/__tests__/hydrateMechanic.test.ts`

**Step 1: Write the tests**

Create `app/engine/utils/__tests__/hydrateMechanic.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { hydrateMechanic } from "../hydrateMechanic";
import { Mechanic } from "@/app/types/Mechanic";

// Template fixtures matching the library JSON files

const antiTemplate: Mechanic = {
    name: "Anti",
    entity: "thisModel",
    effect: "autoSuccess",
    attribute: "wound",
    value: "$param",
    conditions: [
        {
            entity: "targetUnit",
            keywords: ["$keyword"],
            operator: "includes",
            value: "$keyword",
        },
    ],
};

const sustainedHitsTemplate: Mechanic = {
    name: "sustained-hits",
    entity: "thisModel",
    effect: "extraSuccess",
    attribute: "hit",
    value: "$param",
    conditions: [
        {
            entity: "diceRoll",
            attribute: "hit",
            operator: "greaterThanOrEqualTo",
            value: "$critical",
        },
    ],
};

const meltaTemplate: Mechanic = {
    name: "melta",
    entity: "thisModel",
    effect: "rollBonus",
    attribute: "damage",
    value: "$param",
    conditions: [
        {
            entity: "targetUnit",
            attribute: "range",
            operator: "lessThanOrEqualTo",
            value: "$halfRange",
        },
    ],
};

const torrentTemplate: Mechanic = {
    name: "Torrent",
    entity: "thisModel",
    effect: "autoSuccess",
    attribute: "hit",
    value: true,
};

describe("hydrateMechanic", () => {
    it("replaces $param in top-level value", () => {
        const result = hydrateMechanic(sustainedHitsTemplate, {
            key: "sustained-hits",
            param: 2,
        });
        expect(result.value).toBe(2);
    });

    it("replaces $critical with 6 in conditions", () => {
        const result = hydrateMechanic(sustainedHitsTemplate, {
            key: "sustained-hits",
            param: 1,
        });
        expect(result.conditions![0].value).toBe(6);
    });

    it("replaces $keyword in condition value and keywords array", () => {
        const result = hydrateMechanic(antiTemplate, {
            key: "anti",
            param: 4,
            keyword: "INFANTRY",
        });
        expect(result.value).toBe(4);
        expect(result.conditions![0].value).toBe("INFANTRY");
        expect(result.conditions![0].keywords).toEqual(["INFANTRY"]);
    });

    it("replaces $halfRange when option provided", () => {
        const result = hydrateMechanic(
            meltaTemplate,
            { key: "melta", param: 2 },
            { halfRange: 12 },
        );
        expect(result.value).toBe(2);
        expect(result.conditions![0].value).toBe(12);
    });

    it("does not mutate the original template", () => {
        const originalValue = antiTemplate.value;
        const originalConditionValue = antiTemplate.conditions![0].value;

        hydrateMechanic(antiTemplate, {
            key: "anti",
            param: 4,
            keyword: "PSYKER",
        });

        expect(antiTemplate.value).toBe(originalValue);
        expect(antiTemplate.conditions![0].value).toBe(originalConditionValue);
    });

    it("returns mechanic unchanged when no placeholders present", () => {
        const result = hydrateMechanic(torrentTemplate, { key: "torrent" });
        expect(result).toEqual(torrentTemplate);
    });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- app/engine/utils/__tests__/hydrateMechanic.test.ts`
Expected: FAIL — cannot find module `../hydrateMechanic`

**Step 3: Commit**

```bash
git add app/engine/utils/__tests__/hydrateMechanic.test.ts
git commit -m "Add failing tests for hydrateMechanic"
```

---

### Task 5: `hydrateMechanic` — implementation

**Files:**
- Create: `app/engine/utils/hydrateMechanic.ts`

**Step 1: Implement the hydrator**

Create `app/engine/utils/hydrateMechanic.ts`:

```ts
import { Mechanic, Condition } from "@/app/types/Mechanic";
import { ParsedAttribute } from "./parseParameterisedName";

const CRITICAL_THRESHOLD = 6;

type PlaceholderValue = string | number | boolean;

interface HydrateOptions {
    halfRange?: number;
}

const isPlaceholder = (value: unknown): value is string =>
    typeof value === "string" && value.startsWith("$");

const resolveValue = (
    value: PlaceholderValue,
    parsed: ParsedAttribute,
    options: HydrateOptions,
): PlaceholderValue => {
    if (!isPlaceholder(value)) return value;

    switch (value) {
        case "$param":
            return parsed.param ?? value;
        case "$keyword":
            return parsed.keyword ?? value;
        case "$critical":
            return CRITICAL_THRESHOLD;
        case "$halfRange":
            return options.halfRange ?? value;
        default:
            return value;
    }
};

const hydrateCondition = (
    condition: Condition,
    parsed: ParsedAttribute,
    options: HydrateOptions,
): Condition => {
    const hydrated: Condition = {
        ...condition,
        value: resolveValue(
            condition.value as PlaceholderValue,
            parsed,
            options,
        ),
    };

    if (condition.keywords) {
        hydrated.keywords = condition.keywords.map((kw) =>
            typeof kw === "string" && kw === "$keyword" && parsed.keyword
                ? parsed.keyword
                : kw,
        );
    }

    return hydrated;
};

/**
 * Deep-clones a template mechanic and replaces all placeholder values.
 *
 * Placeholders:
 * - "$param"     → parsed.param
 * - "$keyword"   → parsed.keyword
 * - "$critical"  → 6
 * - "$halfRange" → options.halfRange
 */
export const hydrateMechanic = (
    template: Mechanic,
    parsed: ParsedAttribute,
    options: HydrateOptions = {},
): Mechanic => {
    const hydrated: Mechanic = {
        ...template,
        value: resolveValue(template.value, parsed, options),
    };

    if (template.conditions) {
        hydrated.conditions = template.conditions.map((c) =>
            hydrateCondition(c, parsed, options),
        );
    }

    return hydrated;
};
```

**Step 2: Run tests to verify they pass**

Run: `npm test -- app/engine/utils/__tests__/hydrateMechanic.test.ts`
Expected: All 6 tests PASS

**Step 3: Run all tests to make sure nothing broke**

Run: `npm test`
Expected: All 18 tests PASS (12 parser + 6 hydrator)

**Step 4: Commit**

```bash
git add app/engine/utils/hydrateMechanic.ts
git commit -m "Implement hydrateMechanic utility"
```

---

### Task 6: Update `collectWeaponMechanics` — tests

**Files:**
- Create: `app/engine/collectors/__tests__/collectWeaponMechanics.test.ts`

**Context:** `collectWeaponMechanics` takes a `CombatContext` and returns `TaggedMechanic[]`. We need a minimal context fixture. The `CombatContext` interface is at `app/types/CombatContext.ts` — it requires `attacker` (`TestUnit`), `defender` (`TestUnit`), `weaponProfile` (`WeaponProfile`), and several other fields.

To keep tests focused, build minimal fixtures that satisfy the types. The function only reads `context.weaponProfile.attributes` and `context.weaponProfile.range`.

**Step 1: Write the tests**

Create `app/engine/collectors/__tests__/collectWeaponMechanics.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { collectWeaponMechanics } from "../collectWeaponMechanics";
import { CombatContext } from "@/app/types/CombatContext";
import { WeaponProfile } from "@/app/types/Weapon";

const makeContext = (
    attributes: string[],
    range: number | string = 24,
): CombatContext =>
    ({
        weaponProfile: {
            attributes,
            range,
        } as WeaponProfile,
    }) as CombatContext;

describe("collectWeaponMechanics", () => {
    it("collects a non-parameterised attribute (ASSAULT)", () => {
        const result = collectWeaponMechanics(makeContext(["ASSAULT"]));
        expect(result).toHaveLength(1);
        expect(result[0].mechanic.effect).toBe("addsBehaviour");
        expect(result[0].layer).toBe("weaponAttribute");
        expect(result[0].perspective).toBe("attacker");
    });

    it("collects ANTI-INFANTRY 4+ with hydrated values", () => {
        const result = collectWeaponMechanics(
            makeContext(["ANTI-INFANTRY 4+"]),
        );
        expect(result).toHaveLength(1);
        const m = result[0].mechanic;
        expect(m.effect).toBe("autoSuccess");
        expect(m.attribute).toBe("wound");
        expect(m.value).toBe(4);
        expect(m.conditions![0].value).toBe("INFANTRY");
        expect(m.conditions![0].keywords).toEqual(["INFANTRY"]);
    });

    it("collects SUSTAINED HITS 1 with hydrated param and critical", () => {
        const result = collectWeaponMechanics(
            makeContext(["SUSTAINED HITS 1"]),
        );
        expect(result).toHaveLength(1);
        const m = result[0].mechanic;
        expect(m.effect).toBe("extraSuccess");
        expect(m.value).toBe(1);
        expect(m.conditions![0].value).toBe(6);
    });

    it("collects MELTA 2 with hydrated param and halfRange", () => {
        const result = collectWeaponMechanics(
            makeContext(["MELTA 2"], 24),
        );
        expect(result).toHaveLength(1);
        const m = result[0].mechanic;
        expect(m.effect).toBe("rollBonus");
        expect(m.attribute).toBe("damage");
        expect(m.value).toBe(2);
        expect(m.conditions![0].value).toBe(12);
    });

    it("collects RAPID FIRE 1 with hydrated param and halfRange", () => {
        const result = collectWeaponMechanics(
            makeContext(["RAPID FIRE 1"], 30),
        );
        expect(result).toHaveLength(1);
        const m = result[0].mechanic;
        expect(m.effect).toBe("rollBonus");
        expect(m.attribute).toBe("attacks");
        expect(m.value).toBe(1);
        expect(m.conditions![0].value).toBe(15);
    });

    it("collects multiple attributes from the same weapon", () => {
        const result = collectWeaponMechanics(
            makeContext(["ANTI-PSYKER 4+", "DEVASTATING WOUNDS"]),
        );
        expect(result).toHaveLength(2);
        expect(result[0].mechanic.value).toBe(4);
        expect(result[1].mechanic.effect).toBe("mortalWounds");
    });

    it("skips melee weapons for halfRange (no crash)", () => {
        const result = collectWeaponMechanics(
            makeContext(["MELTA 2"], "Melee"),
        );
        expect(result).toHaveLength(1);
        // halfRange stays as placeholder string since range is not numeric
        expect(result[0].mechanic.value).toBe(2);
    });

    it("ignores unrecognised attributes", () => {
        const result = collectWeaponMechanics(
            makeContext(["MADE UP THING"]),
        );
        expect(result).toHaveLength(0);
    });

    it("still collects existing non-parameterised attributes", () => {
        const result = collectWeaponMechanics(
            makeContext(["HEAVY", "TORRENT", "IGNORES COVER"]),
        );
        expect(result).toHaveLength(3);
    });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- app/engine/collectors/__tests__/collectWeaponMechanics.test.ts`
Expected: FAIL — some tests fail because the current implementation doesn't handle parameterised attributes.

**Step 3: Commit**

```bash
git add app/engine/collectors/__tests__/collectWeaponMechanics.test.ts
git commit -m "Add failing tests for parameterised collectWeaponMechanics"
```

---

### Task 7: Update `collectWeaponMechanics` — implementation

**Files:**
- Modify: `app/engine/collectors/collectWeaponMechanics.ts`

**Step 1: Rewrite collectWeaponMechanics.ts**

Replace the contents of `app/engine/collectors/collectWeaponMechanics.ts`:

```ts
import { Mechanic } from "@/app/types/Mechanic";
import { CombatContext } from "@/app/types/CombatContext";
import { TaggedMechanic } from "./collectAllMechanics";
import { parseParameterisedName } from "../utils/parseParameterisedName";
import { hydrateMechanic } from "../utils/hydrateMechanic";

import anti from "@/app/library/weapon-attributes/anti.json";
import assault from "@/app/library/weapon-attributes/assault.json";
import blast from "@/app/library/weapon-attributes/blast.json";
import devastatingWounds from "@/app/library/weapon-attributes/devastating-wounds.json";
import heavy from "@/app/library/weapon-attributes/heavy.json";
import ignoresCover from "@/app/library/weapon-attributes/ignores-cover.json";
import lance from "@/app/library/weapon-attributes/lance.json";
import lethalHits from "@/app/library/weapon-attributes/lethal-hits.json";
import melta from "@/app/library/weapon-attributes/melta.json";
import pistol from "@/app/library/weapon-attributes/pistol.json";
import rapidFire from "@/app/library/weapon-attributes/rapid-fire.json";
import sustainedHits from "@/app/library/weapon-attributes/sustained-hits.json";
import torrent from "@/app/library/weapon-attributes/torrent.json";
import twinLinked from "@/app/library/weapon-attributes/twin-linked.json";

const weaponAttributeRegistry: Record<string, Mechanic> = {
    anti: anti as unknown as Mechanic,
    assault: assault as unknown as Mechanic,
    blast: blast as unknown as Mechanic,
    "devastating-wounds": devastatingWounds as unknown as Mechanic,
    heavy: heavy as unknown as Mechanic,
    "ignores-cover": ignoresCover as unknown as Mechanic,
    lance: lance as unknown as Mechanic,
    "lethal-hits": lethalHits as unknown as Mechanic,
    melta: melta as unknown as Mechanic,
    pistol: pistol as unknown as Mechanic,
    "rapid-fire": rapidFire as unknown as Mechanic,
    "sustained-hits": sustainedHits as unknown as Mechanic,
    torrent: torrent as unknown as Mechanic,
    "twin-linked": twinLinked as unknown as Mechanic,
};

export const collectWeaponMechanics = (
    context: CombatContext,
): TaggedMechanic[] => {
    const results: TaggedMechanic[] = [];
    const halfRange =
        typeof context.weaponProfile.range === "number"
            ? context.weaponProfile.range / 2
            : undefined;

    for (const attrName of context.weaponProfile.attributes) {
        const parsed = parseParameterisedName(attrName);
        const template = weaponAttributeRegistry[parsed.key];
        if (!template) continue;

        const mechanic = hydrateMechanic(template, parsed, { halfRange });
        results.push({
            mechanic,
            layer: "weaponAttribute",
            perspective: "attacker",
        });
    }

    return results;
};
```

Key changes from the original:
- Registry keys are now the hyphenated `parsed.key` format (e.g. `"sustained-hits"`) instead of the sanitized/stripped format (e.g. `"sustainedhits"`). This matches the output of `parseParameterisedName`.
- The loop calls `parseParameterisedName` → registry lookup by `parsed.key` → `hydrateMechanic`.
- `halfRange` is computed once before the loop.

**Step 2: Run the collector tests**

Run: `npm test -- app/engine/collectors/__tests__/collectWeaponMechanics.test.ts`
Expected: All 9 tests PASS

**Step 3: Run all tests**

Run: `npm test`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add app/engine/collectors/collectWeaponMechanics.ts
git commit -m "Update collectWeaponMechanics with parse-and-hydrate flow"
```

---

### Task 8: Update `expandWeaponAttributeMechanics` — tests

**Files:**
- Create: `app/engine/collectors/__tests__/expandWeaponAttributeMechanics.test.ts`

**Context:** `expandWeaponAttributeMechanics` takes a `TaggedMechanic[]` and a `CombatContext`. It filters mechanics with `effect: "addsWeaponAttribute"`, evaluates their conditions, and expands the `weaponAttributes[]` array into concrete mechanics from the registry. It needs access to `filterByConditions` from `conditionResolver` — for testing, we pass mechanics with no conditions so they always pass.

**Step 1: Write the tests**

Create `app/engine/collectors/__tests__/expandWeaponAttributeMechanics.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { expandWeaponAttributeMechanics } from "../expandWeaponAttributeMechanics";
import { TaggedMechanic } from "../collectAllMechanics";
import { CombatContext } from "@/app/types/CombatContext";
import { WeaponProfile } from "@/app/types/Weapon";

const makeContext = (range: number | string = 24): CombatContext =>
    ({
        weaponProfile: { range, attributes: [] } as unknown as WeaponProfile,
        attacker: { combatState: {} },
        defender: { combatState: {} },
    }) as unknown as CombatContext;

const makeAddsWeaponAttr = (
    weaponAttributes: string[],
    value: number | boolean | string = true,
): TaggedMechanic => ({
    mechanic: {
        name: "test-ability",
        entity: "thisModel",
        effect: "addsWeaponAttribute",
        value,
        weaponAttributes,
    },
    layer: "unitAbility",
    perspective: "attacker",
});

describe("expandWeaponAttributeMechanics", () => {
    it("expands SUSTAINED HITS with param from ability value", () => {
        const input = [makeAddsWeaponAttr(["SUSTAINED HITS"], 2)];
        const result = expandWeaponAttributeMechanics(input, makeContext());

        expect(result).toHaveLength(1);
        const m = result[0].mechanic;
        expect(m.effect).toBe("extraSuccess");
        expect(m.value).toBe(2);
        expect(m.conditions![0].value).toBe(6); // $critical → 6
    });

    it("expands LETHAL HITS (no param needed)", () => {
        const input = [makeAddsWeaponAttr(["LETHAL HITS"])];
        const result = expandWeaponAttributeMechanics(input, makeContext());

        expect(result).toHaveLength(1);
        expect(result[0].mechanic.effect).toBe("autoSuccess");
        expect(result[0].mechanic.attribute).toBe("wound");
    });

    it("expands DEVASTATING WOUNDS (no param needed)", () => {
        const input = [makeAddsWeaponAttr(["DEVASTATING WOUNDS"])];
        const result = expandWeaponAttributeMechanics(input, makeContext());

        expect(result).toHaveLength(1);
        expect(result[0].mechanic.effect).toBe("mortalWounds");
    });

    it("passes through non-addsWeaponAttribute mechanics unchanged", () => {
        const passthrough: TaggedMechanic = {
            mechanic: {
                name: "stealth",
                entity: "opposingUnit",
                effect: "rollPenalty",
                attribute: "hit",
                value: 1,
            },
            layer: "unitAbility",
            perspective: "defender",
        };
        const result = expandWeaponAttributeMechanics(
            [passthrough],
            makeContext(),
        );

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(passthrough);
    });

    it("preserves perspective from the source mechanic", () => {
        const input: TaggedMechanic[] = [
            {
                ...makeAddsWeaponAttr(["LETHAL HITS"]),
                perspective: "defender",
            },
        ];
        const result = expandWeaponAttributeMechanics(input, makeContext());
        expect(result[0].perspective).toBe("defender");
    });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- app/engine/collectors/__tests__/expandWeaponAttributeMechanics.test.ts`
Expected: Some tests FAIL — the current implementation uses the old sanitized registry keys and doesn't hydrate `$critical`.

**Step 3: Commit**

```bash
git add app/engine/collectors/__tests__/expandWeaponAttributeMechanics.test.ts
git commit -m "Add failing tests for parameterised expandWeaponAttributeMechanics"
```

---

### Task 9: Update `expandWeaponAttributeMechanics` — implementation

**Files:**
- Modify: `app/engine/collectors/expandWeaponAttributeMechanics.ts`

**Step 1: Rewrite expandWeaponAttributeMechanics.ts**

Replace the contents of `app/engine/collectors/expandWeaponAttributeMechanics.ts`:

```ts
import { Mechanic } from "@/app/types/Mechanic";
import { CombatContext } from "@/app/types/CombatContext";
import { TaggedMechanic } from "./collectAllMechanics";
import { filterByConditions } from "../resolvers/conditionResolver";
import { parseParameterisedName } from "../utils/parseParameterisedName";
import { hydrateMechanic } from "../utils/hydrateMechanic";

import anti from "@/app/library/weapon-attributes/anti.json";
import assault from "@/app/library/weapon-attributes/assault.json";
import blast from "@/app/library/weapon-attributes/blast.json";
import devastatingWounds from "@/app/library/weapon-attributes/devastating-wounds.json";
import heavy from "@/app/library/weapon-attributes/heavy.json";
import ignoresCover from "@/app/library/weapon-attributes/ignores-cover.json";
import lance from "@/app/library/weapon-attributes/lance.json";
import lethalHits from "@/app/library/weapon-attributes/lethal-hits.json";
import melta from "@/app/library/weapon-attributes/melta.json";
import pistol from "@/app/library/weapon-attributes/pistol.json";
import rapidFire from "@/app/library/weapon-attributes/rapid-fire.json";
import sustainedHits from "@/app/library/weapon-attributes/sustained-hits.json";
import torrent from "@/app/library/weapon-attributes/torrent.json";
import twinLinked from "@/app/library/weapon-attributes/twin-linked.json";

const weaponAttributeRegistry: Record<string, Mechanic> = {
    anti: anti as unknown as Mechanic,
    assault: assault as unknown as Mechanic,
    blast: blast as unknown as Mechanic,
    "devastating-wounds": devastatingWounds as unknown as Mechanic,
    heavy: heavy as unknown as Mechanic,
    "ignores-cover": ignoresCover as unknown as Mechanic,
    lance: lance as unknown as Mechanic,
    "lethal-hits": lethalHits as unknown as Mechanic,
    melta: melta as unknown as Mechanic,
    pistol: pistol as unknown as Mechanic,
    "rapid-fire": rapidFire as unknown as Mechanic,
    "sustained-hits": sustainedHits as unknown as Mechanic,
    torrent: torrent as unknown as Mechanic,
    "twin-linked": twinLinked as unknown as Mechanic,
};

export const expandWeaponAttributeMechanics = (
    mechanics: TaggedMechanic[],
    context: CombatContext,
): TaggedMechanic[] => {
    const adds = mechanics.filter(
        (tm) => tm.mechanic.effect === "addsWeaponAttribute",
    );
    const rest = mechanics.filter(
        (tm) => tm.mechanic.effect !== "addsWeaponAttribute",
    );

    const activeAdds = filterByConditions(adds, context);
    const halfRange =
        typeof context.weaponProfile.range === "number"
            ? context.weaponProfile.range / 2
            : undefined;

    const expanded: TaggedMechanic[] = [];
    for (const tagged of activeAdds) {
        if (!tagged.mechanic.weaponAttributes) continue;
        for (const name of tagged.mechanic.weaponAttributes) {
            const parsed = parseParameterisedName(name);
            const template = weaponAttributeRegistry[parsed.key];
            if (!template) continue;

            // If the ability carries a value (e.g. "2" for Sustained Hits 2),
            // use it as the param for hydration
            if (parsed.param === undefined && tagged.mechanic.value != null) {
                parsed.param =
                    typeof tagged.mechanic.value === "number"
                        ? tagged.mechanic.value
                        : undefined;
            }

            const mechanic = hydrateMechanic(template, parsed, { halfRange });
            expanded.push({
                mechanic,
                layer: "weaponAttribute",
                perspective: tagged.perspective,
            });
        }
    }

    return [...rest, ...expanded];
};
```

Key changes from the original:
- Registry uses hyphenated keys matching `parseParameterisedName` output.
- Full registry (all 14 weapon attributes) instead of just 3.
- Uses `parseParameterisedName` to parse the attribute name from `weaponAttributes[]`.
- Uses `hydrateMechanic` instead of manual `$param` swap.
- Falls back to `tagged.mechanic.value` as `param` when the attribute name itself doesn't contain a parameter (e.g. ability grants `"SUSTAINED HITS"` with `value: 2`).

**Step 2: Run the expand tests**

Run: `npm test -- app/engine/collectors/__tests__/expandWeaponAttributeMechanics.test.ts`
Expected: All 5 tests PASS

**Step 3: Run all tests**

Run: `npm test`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add app/engine/collectors/expandWeaponAttributeMechanics.ts
git commit -m "Update expandWeaponAttributeMechanics with parse-and-hydrate flow"
```

---

### Task 10: Verify against real test data

Smoke-test the changes against the actual datasheet data to confirm real weapon profiles with parameterised attributes produce correct mechanics.

**Files:**
- None created or modified — this is a verification step.

**Step 1: Check the app builds cleanly**

Run: `npm run build`
Expected: Build succeeds with no type errors.

**Step 2: Run all tests one final time**

Run: `npm test`
Expected: All tests PASS.

**Step 3: Commit (if any type fixes were needed)**

Only if build or tests revealed issues that required fixes.
