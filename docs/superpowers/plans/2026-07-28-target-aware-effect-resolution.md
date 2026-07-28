# Target-aware Effect Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make combat effect resolution honour each mechanic's declared target `entity`, so a stat-modifier only applies to the unit it targets (fixing e.g. a stealthy unit penalising its own shooting).

**Architecture:** Add one pipeline filter step (`filterByTarget`) that drops mis-directed stat-modifiers before `resolveEffects`, using the already-existing `resolveEntity`. Migrate the entity vocabulary so hand-authored/injected mechanics use the relative `opposingUnit` instead of the absolute `attackingUnit`, which is removed. `ResolvedModifiers` and all phase resolvers are unchanged.

**Tech Stack:** TypeScript, Next.js, Vitest.

## Global Constraints

- **Commits are user-gated:** per project rule, do NOT commit automatically. Perform commit steps only when the user explicitly authorises. (Commit steps are included for completeness; treat them as "commit on the user's go-ahead".)
- **Thin engine, rich data:** direction lives in the mechanic JSON (`entity` + `phase`); the engine only enforces it. Do not add new mechanic properties.
- **Test runner:** `npx vitest run [path]`. Typecheck: `npx tsc --noEmit` (there are 8 pre-existing `operatorEvaluator` errors unrelated to this work — those, and only those, may remain).
- **Attribute → owning side (canonical map, copy verbatim):** attacker = `hit, wound, ballisticSkill, weaponSkill, strength, armourPenetration, damage, attacks`; defender = `save, toughness, invulnSave, feelNoPain`.

---

### Task 1: `filterByTarget` resolver + attribute→side map

**Files:**
- Create: `app/engine/resolvers/targetResolver.ts`
- Test: `app/engine/resolvers/__tests__/targetResolver.test.ts`

**Interfaces:**
- Consumes: `resolveEntity(entity, context, perspective)` from `app/engine/resolvers/entityResolver.ts` (returns `{ unit, ... }`); `TaggedMechanic` from `app/engine/collectors/collectAllMechanics.ts`.
- Produces: `filterByTarget(mechanics: TaggedMechanic[], context: CombatContext): TaggedMechanic[]` — drops any mechanic whose `attribute` has a known owning side and whose resolved target is the opposite side; passes everything else through.

- [ ] **Step 1: Write the failing tests**

```ts
// app/engine/resolvers/__tests__/targetResolver.test.ts
import { describe, it, expect } from "vitest";
import { filterByTarget } from "../targetResolver";
import { CombatContext } from "@/app/types/CombatContext";
import { TaggedMechanic } from "../../collectors/collectAllMechanics";

const context = {
    attacker: { combatState: {} },
    defender: { combatState: {} },
    weaponProfile: {},
} as unknown as CombatContext;

const tag = (
    entity: string,
    perspective: "attacker" | "defender",
    attribute?: string,
    effect = "rollPenalty",
): TaggedMechanic =>
    ({
        mechanic: { name: "m", entity, effect, attribute, value: 1 },
        layer: "unitAbility",
        perspective,
    }) as unknown as TaggedMechanic;

describe("filterByTarget", () => {
    it("keeps a ballisticSkill modifier whose target is the attacker", () => {
        // opposingUnit from the defender's perspective resolves to the attacker
        const kept = filterByTarget([tag("opposingUnit", "defender", "ballisticSkill")], context);
        expect(kept).toHaveLength(1);
    });

    it("drops a ballisticSkill modifier whose target is the defender", () => {
        // thisUnit from the defender's perspective resolves to the defender (wrong side for BS)
        const kept = filterByTarget([tag("thisUnit", "defender", "ballisticSkill")], context);
        expect(kept).toHaveLength(0);
    });

    it("keeps a save modifier whose target is the defender", () => {
        // opposingUnit from the attacker's perspective resolves to the defender
        const kept = filterByTarget([tag("opposingUnit", "attacker", "save")], context);
        expect(kept).toHaveLength(1);
    });

    it("passes through mechanics with no attribute", () => {
        const kept = filterByTarget([tag("targetUnit", "attacker", undefined, "forceRoll")], context);
        expect(kept).toHaveLength(1);
    });

    it("passes through attributes with no known owning side", () => {
        const kept = filterByTarget([tag("thisUnit", "attacker", "movement")], context);
        expect(kept).toHaveLength(1);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run app/engine/resolvers/__tests__/targetResolver.test.ts`
Expected: FAIL — cannot resolve `../targetResolver` (module does not exist).

- [ ] **Step 3: Write the resolver**

```ts
// app/engine/resolvers/targetResolver.ts
import { Attribute } from "@/app/types/Mechanic";
import { CombatContext } from "@/app/types/CombatContext";
import { TaggedMechanic } from "../collectors/collectAllMechanics";
import { resolveEntity } from "./entityResolver";

type Side = "attacker" | "defender";

/**
 * The unit whose characteristic/roll each combat attribute belongs to during
 * resolution. A stat-modifier only applies if its declared target is this side.
 * Attributes not listed here (movement, wounds, behaviours, etc.) are not
 * direction-filtered.
 */
const ATTRIBUTE_SIDE: Partial<Record<Attribute, Side>> = {
    hit: "attacker",
    wound: "attacker",
    ballisticSkill: "attacker",
    weaponSkill: "attacker",
    strength: "attacker",
    armourPenetration: "attacker",
    damage: "attacker",
    attacks: "attacker",
    save: "defender",
    toughness: "defender",
    invulnSave: "defender",
    feelNoPain: "defender",
};

export const filterByTarget = (
    mechanics: TaggedMechanic[],
    context: CombatContext,
): TaggedMechanic[] =>
    mechanics.filter(({ mechanic, perspective }) => {
        const attr = mechanic.attribute;
        if (!attr) return true;

        const owningSide = ATTRIBUTE_SIDE[attr];
        if (!owningSide) return true; // not a directional combat attribute

        const targetUnit = resolveEntity(
            mechanic.entity,
            context,
            perspective,
        ).unit;
        const targetSide: Side =
            targetUnit === context.defender ? "defender" : "attacker";

        return targetSide === owningSide;
    });
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run app/engine/resolvers/__tests__/targetResolver.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit** (on the user's go-ahead)

```bash
git add app/engine/resolvers/targetResolver.ts app/engine/resolvers/__tests__/targetResolver.test.ts
git commit -m "feat(engine): add filterByTarget resolver for target-aware effect resolution"
```

---

### Task 2: Wire `filterByTarget` into the combat pipeline

**Files:**
- Modify: `app/engine/pipeline/runCombat.ts`
- Test: `app/engine/pipeline/__tests__/runCombat.targeting.test.ts` (create)

**Interfaces:**
- Consumes: `filterByTarget` (Task 1); `runCombat(context)`, `buildCombatContext(...)`.
- Produces: no new exports — behaviour change only (mis-directed mechanics no longer reach `resolveEffects`).

- [ ] **Step 1: Write the failing integration test**

```ts
// app/engine/pipeline/__tests__/runCombat.targeting.test.ts
import { describe, it, expect } from "vitest";
import { buildCombatContext } from "../buildCombatContext";
import { runCombat } from "../runCombat";
import { TestUnit } from "@/app/types/Test";
import { WeaponProfile } from "@/app/types/Weapon";
import heavyIntercessors from "@/app/data/output/heavy-intercessor-squad.json";
import infernusSquad from "@/app/data/output/infernus-squad.json";

const heavyBoltRifle: WeaponProfile = {
    datasheetId: "000001177", line: 2, name: "Heavy bolt rifle", type: "Ranged",
    attributes: ["ASSAULT", "HEAVY"], range: 30, a: 2, bsWs: 3, s: 5, ap: -1, d: 2,
};

const attacker = heavyIntercessors as unknown as TestUnit;

// A defender ability that (incorrectly) targets ITSELF with a ballisticSkill
// penalty. ballisticSkill belongs to the attacker, so this must be dropped.
const misdirected = (entity: string): TestUnit =>
    ({
        ...(infernusSquad as unknown as TestUnit),
        abilities: [
            {
                name: "Test",
                type: "Datasheet",
                mechanics: [
                    { name: "Test", entity, effect: "rollPenalty", attribute: "ballisticSkill", value: 1, phase: ["shooting"] },
                ],
            },
        ],
    }) as unknown as TestUnit;

const shoot = (defender: TestUnit) =>
    runCombat(buildCombatContext({ attacker, defender, weaponProfile: heavyBoltRifle, engagementPhase: "shooting" }));

describe("runCombat — target-aware filtering", () => {
    it("drops a defender-targeted ballisticSkill penalty (does not touch the attacker's hit)", () => {
        // thisUnit on the defender resolves to the defender → wrong side → dropped
        expect(shoot(misdirected("thisUnit")).hitPhase.targetRoll).toBe(2);
    });

    it("keeps an attacker-targeted ballisticSkill penalty", () => {
        // opposingUnit on the defender resolves to the attacker → kept
        expect(shoot(misdirected("opposingUnit")).hitPhase.targetRoll).toBe(3);
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run app/engine/pipeline/__tests__/runCombat.targeting.test.ts`
Expected: FAIL on the first case — target roll is 3 (penalty wrongly applied) instead of 2, because `filterByTarget` is not yet wired in.

- [ ] **Step 3: Wire the filter into `runCombat`**

In `app/engine/pipeline/runCombat.ts`, add the import near the other resolver imports:

```ts
import { filterByTarget } from "../resolvers/targetResolver";
```

Then insert the filter between `resolveIgnoreStates` and `resolveEffects`:

```ts
    // Stage 2.5: Resolve ignoreState — remove state-sourced mechanics that are overridden
    const { mechanics: statefulMechanics, overrideSources } =
        resolveIgnoreStates(activeMechanics);

    // Stage 2.6: Drop mis-directed stat-modifiers (honour each mechanic's target entity)
    const targetedMechanics = filterByTarget(statefulMechanics, context);

    // Stage 3: Resolve effects — group by attribute, apply precedence
    const resolved = resolveEffects(targetedMechanics, overrideSources);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run app/engine/pipeline/__tests__/runCombat.targeting.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the full suite to check for regressions**

Run: `npx vitest run`
Expected: all pass. (Cover/stealth tests still pass because their mechanics currently use `attackingUnit`, which resolves to the attacker and matches the `ballisticSkill` owning side — Task 3 migrates them to `opposingUnit`.)

- [ ] **Step 6: Commit** (on the user's go-ahead)

```bash
git add app/engine/pipeline/runCombat.ts app/engine/pipeline/__tests__/runCombat.targeting.test.ts
git commit -m "feat(engine): apply target-aware filtering in the combat pipeline"
```

---

### Task 3: Migrate entity vocabulary (`attacking*` → `opposingUnit`) + acceptance tests

**Files:**
- Modify: `app/types/Mechanic.ts` (remove `attackingUnit`/`attackingModel` from `Entity`)
- Modify: `app/types/Test.ts` (remove them from the local `Entity` union)
- Modify: `app/engine/resolvers/entityResolver.ts` (remove the `attackingUnit`/`attackingModel` cases)
- Modify: `app/library/combat-states/benefit-of-cover.json`, `app/library/combat-states/hidden.json`, `app/library/unit-abilities/stealth.json` (`attackingUnit` → `opposingUnit`)
- Modify: `app/data/output/infernus-squad.json` (innate STEALTH mechanic `attackingUnit` → `opposingUnit`)
- Modify: `app/engine/pipeline/__tests__/runCombat.stealth.test.ts` (replace the `attackingUnit` literal in the ignore-cover mechanic; add the acceptance test)

**Interfaces:**
- Consumes: `filterByTarget` behaviour from Tasks 1–2.
- Produces: no new exports; the `Entity` union no longer contains `attackingUnit`/`attackingModel`.

- [ ] **Step 1: Write the failing acceptance test**

Add to `app/engine/pipeline/__tests__/runCombat.stealth.test.ts` (this unit's `baseInfernus` already strips innate STEALTH; reuse the file's `heavyBoltRifle`/`stealthAbilityObj`):

```ts
    it("does NOT penalise a stealthy unit's own shooting (stealth on the attacker)", () => {
        const stealthyAttacker = {
            ...(heavyIntercessors as unknown as TestUnit),
            abilities: [
                ...((heavyIntercessors as unknown as TestUnit).abilities ?? []),
                stealthAbilityObj,
            ],
        } as unknown as TestUnit;

        const result = runCombat(
            buildCombatContext({
                attacker: stealthyAttacker,
                defender: baseInfernus,
                weaponProfile: heavyBoltRifle,
                engagementPhase: "shooting",
            }),
        );

        // Stealth on the shooter must be inert → base 2+ (HEAVY, stationary), not 3+.
        expect(result.hitPhase.targetRoll).toBe(2);
    });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run app/engine/pipeline/__tests__/runCombat.stealth.test.ts`
Expected: FAIL — target roll is 3. `stealth.json` still uses `attackingUnit` (absolute → attacker), so `filterByTarget` keeps it and it penalises the attacker's own hit.

- [ ] **Step 3: Migrate the library/data JSON to `opposingUnit`**

Set `"entity": "opposingUnit"` in each of:
- `app/library/combat-states/benefit-of-cover.json`
- `app/library/combat-states/hidden.json`
- `app/library/unit-abilities/stealth.json`
- `app/data/output/infernus-squad.json` — the mechanic inside the innate `"STEALTH"` ability.

Example (`stealth.json`):
```json
{
    "name": "STEALTH",
    "entity": "opposingUnit",
    "effect": "rollPenalty",
    "attribute": "ballisticSkill",
    "value": 1,
    "phase": ["shooting"],
    "stateSource": "benefitOfCover"
}
```

- [ ] **Step 4: Remove `attackingUnit`/`attackingModel` from the type unions**

In `app/types/Mechanic.ts`, delete these two lines from the `Entity` union:
```ts
    | "attackingUnit"
    | "attackingModel"
```
Do the same in the local `Entity` union in `app/types/Test.ts`.

- [ ] **Step 5: Remove the resolver cases**

In `app/engine/resolvers/entityResolver.ts`, delete the block:
```ts
        case "attackingUnit":
        case "attackingModel":
            return {
                unit: context.attacker,
                combatState: context.attacker.combatState,
                weaponProfile: context.weaponProfile,
            };
```
(The `default` case already returns `context.attacker`, so no fallback is lost.)

- [ ] **Step 6: Fix the remaining `attackingUnit` literal in tests**

In `app/engine/pipeline/__tests__/runCombat.stealth.test.ts`, the `ignoresCoverAttacker` fixture's `ignoreState` mechanic uses `entity: "attackingUnit"`. Change it to `entity: "opposingUnit"` (the entity is immaterial to `ignoreState`, which strips by `stateSource`, but must be a valid `Entity`).

- [ ] **Step 7: Run the stealth + cover suites to verify green**

Run: `npx vitest run app/engine/pipeline/__tests__/runCombat.stealth.test.ts app/engine/pipeline/__tests__/runCombat.cover.test.ts`
Expected: PASS. Acceptance test now returns 2+. Stealth-on-defender still 3+; cover still -1; non-stacking preserved; ignore-cover still strips.

- [ ] **Step 8: Full suite + typecheck**

Run: `npx vitest run` — Expected: all pass.
Run: `npx tsc --noEmit 2>&1 | grep "error TS"` — Expected: only the 8 pre-existing `operatorEvaluator` errors; confirm no error mentions `attackingUnit`, `entityResolver`, `targetResolver`, or the changed JSON.

- [ ] **Step 9: Update the memory note**

Edit `/Users/liamco/.claude/projects/-Users-liamco-Sites-Personal-augur-engine/memory/attacker-entity-and-characteristic-modifiers.md` and `MEMORY.md`: replace references to the absolute `attackingUnit` entity with the new guidance — hand-authored/injected mechanics use the relative `opposingUnit`; `filterByTarget` enforces the declared target so direction self-corrects.

- [ ] **Step 10: Commit** (on the user's go-ahead)

```bash
git add app/types/Mechanic.ts app/types/Test.ts app/engine/resolvers/entityResolver.ts \
  app/library/combat-states/benefit-of-cover.json app/library/combat-states/hidden.json \
  app/library/unit-abilities/stealth.json app/data/output/infernus-squad.json \
  app/engine/pipeline/__tests__/runCombat.stealth.test.ts
git commit -m "refactor(engine): replace absolute attackingUnit with relative opposingUnit; direction now enforced by filterByTarget"
```

---

## Self-Review

**Spec coverage:**
- Part 1 (vocabulary: remove `attacking*`, cover/stealth → `opposingUnit`, keep `target*`) → Task 3 steps 3–6. ✓
- Part 2 (engine: `filterByTarget`, attribute→side map, inserted before `resolveEffects`, phases/`ResolvedModifiers` unchanged, guardrail for non-attribute mechanics) → Task 1 + Task 2. ✓
- Part 3 verification cases (stealthy attacker inert; stealthy defender -1; cover unchanged; directional offensive modifier; non-attribute pass-through; suite/tsc green) → covered by Task 1 tests (pass-through, both directions), Task 2 tests (directional drop/keep), Task 3 acceptance + existing stealth/cover suites, and Task 3 step 8. ✓

**Placeholder scan:** No TBD/TODO; every code step contains full code; every command has expected output. ✓

**Type consistency:** `filterByTarget(mechanics, context)` signature identical across Tasks 1–2; `ATTRIBUTE_SIDE` keys match the Global Constraints map; `opposingUnit` is an existing `Entity` member (unchanged by the removals). ✓
