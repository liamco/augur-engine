# Hidden — Targeting Eligibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a targeting-eligibility layer so a unit that is `isHidden` + `isInCover` + INFANTRY/SWARM/BEAST becomes an invalid target beyond its `detectionRange` (default 15in), surfaced as `CombatResult.eligibility` and shown in the UI.

**Architecture:** The rule lives in `hidden.json` (a `blocksTargeting` mechanic gated by three conditions). Small general engine primitives carry it: an `includesAny` operator, a `blocksTargeting` effect, a `detectionRange` modifiable unit attribute (default 15), and a `resolveTargetEligibility` resolver run after `resolveEffects`. Phases still compute.

**Tech Stack:** TypeScript, Vitest, Next.js.

## Global Constraints

- **Commits are user-gated:** do NOT commit automatically; perform commit steps only on the user's explicit go-ahead.
- **Additive:** existing behaviour must not change. The existing suite (currently 165) stays green; `tsc --noEmit` shows only the 8 pre-existing `operatorEvaluator` errors.
- **Test runner:** `npx vitest run [path]`. Typecheck: `npx tsc --noEmit`.
- **Defaults for placeholder data:** `detectionRange` reads default to **15** when absent; a blank/undefined `rangeToTarget` is **permissive** (eligible).

---

### Task 1: `includesAny` operator

**Files:**
- Modify: `app/types/Mechanic.ts` (add to `Operator` union)
- Modify: `app/engine/resolvers/operatorEvaluator.ts`
- Test: `app/engine/resolvers/__tests__/operatorEvaluator.test.ts` (existing — append)

**Interfaces:**
- Produces: `includesAny` operator — with an array `actual`, true if it intersects `expected` (case-insensitive for strings).

- [ ] **Step 1: Write the failing test** (append to the existing describe block)

```ts
import { evaluateOperator } from "../operatorEvaluator";

describe("includesAny", () => {
    it("is true when arrays intersect (case-insensitive)", () => {
        expect(evaluateOperator("includesAny", ["INFANTRY", "VEHICLE"], ["swarm", "infantry"])).toBe(true);
    });
    it("is false when arrays are disjoint", () => {
        expect(evaluateOperator("includesAny", ["VEHICLE"], ["INFANTRY", "SWARM", "BEAST"])).toBe(false);
    });
    it("is false when actual is not an array", () => {
        expect(evaluateOperator("includesAny", undefined, ["INFANTRY"])).toBe(false);
    });
});
```

- [ ] **Step 2: Run it — expect fail**

Run: `npx vitest run app/engine/resolvers/__tests__/operatorEvaluator.test.ts`
Expected: FAIL — `includesAny` is not a valid `Operator` / no case handles it.

- [ ] **Step 3: Add to the `Operator` union** (`app/types/Mechanic.ts`)

Add the member after `"notIncludes"`:
```ts
    | "notIncludes"
    | "includesAny"
    | "ratioOf";
```

- [ ] **Step 4: Handle it in `operatorEvaluator.ts`**

Add a case before `case "ratioOf":`:
```ts
        case "includesAny":
            if (Array.isArray(actual)) {
                const expectedArr = Array.isArray(expected) ? expected : [expected];
                return expectedArr.some((v) =>
                    actual.some((a) =>
                        typeof a === "string" && typeof v === "string"
                            ? a.toUpperCase() === v.toUpperCase()
                            : a === v,
                    ),
                );
            }
            return false;
```

- [ ] **Step 5: Run it — expect pass**

Run: `npx vitest run app/engine/resolvers/__tests__/operatorEvaluator.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit** (on the user's go-ahead)

```bash
git add app/types/Mechanic.ts app/engine/resolvers/operatorEvaluator.ts app/engine/resolvers/__tests__/operatorEvaluator.test.ts
git commit -m "feat(engine): add includesAny operator (has-any-of keyword matching)"
```

---

### Task 2: Type foundations + `resolveTargetEligibility`

**Files:**
- Modify: `app/types/Mechanic.ts` (`Effect` += `blocksTargeting`; `UnitAttribute` += `detectionRange`)
- Modify: `app/types/State.ts` (`CombatState.isHidden`)
- Modify: `app/types/Test.ts` (`TestModel.detectionRange?`)
- Modify: `app/types/CombatContext.ts` (`rangeToTarget?`)
- Modify: `app/types/CombatResult.ts` (`TargetEligibility` + `CombatResult.eligibility`)
- Modify: `app/engine/resolvers/stateResolver.ts` (`isHidden` mapping)
- Create: `app/engine/resolvers/eligibilityResolver.ts`
- Test: `app/engine/resolvers/__tests__/eligibilityResolver.test.ts`

**Interfaces:**
- Produces: `resolveTargetEligibility(mechanics: TaggedMechanic[], context: CombatContext, modifiers: ResolvedModifiers): TargetEligibility` where `TargetEligibility = { eligible: boolean; reason: string | null }`.

- [ ] **Step 1: Add the type members**

`app/types/Mechanic.ts` — add `| "blocksTargeting"` to the `Effect` union (e.g. after `"autoSuccess"`), and `| "detectionRange"` to the `UnitAttribute` union.

`app/types/State.ts` — add to `CombatState`:
```ts
    isHidden: boolean;
```

`app/types/Test.ts` — add an optional field to the model statline interface (`TestModel`), alongside `sv`/`invSv`/etc.:
```ts
    detectionRange?: number; // detection range in inches; defaults to 15 when absent
```

`app/types/CombatContext.ts` — add to `CombatContext`:
```ts
    rangeToTarget?: number;
```

`app/types/CombatResult.ts` — add and export:
```ts
export interface TargetEligibility {
    eligible: boolean;
    reason: string | null;
}
```
and add to `CombatResult`:
```ts
    eligibility: TargetEligibility;
```

- [ ] **Step 2: Expose `isHidden` in `stateResolver.ts`**

Add to the `stateMap` (next to `benefitOfCover`):
```ts
        isHidden: combatState.isHidden,
```

- [ ] **Step 3: Write the failing resolver tests**

```ts
// app/engine/resolvers/__tests__/eligibilityResolver.test.ts
import { describe, it, expect } from "vitest";
import { resolveTargetEligibility } from "../eligibilityResolver";
import { CombatContext } from "@/app/types/CombatContext";
import { ResolvedModifiers } from "@/app/types/ResolvedModifiers";
import { TaggedMechanic } from "../../collectors/collectAllMechanics";

const ctx = (rangeToTarget?: number, detectionRange?: number): CombatContext =>
    ({
        attacker: { combatState: {} },
        defender: { combatState: {}, models: [{ detectionRange }] },
        weaponProfile: {},
        rangeToTarget,
    }) as unknown as CombatContext;

const hiddenMech = (): TaggedMechanic =>
    ({
        mechanic: { name: "Hidden", entity: "thisUnit", effect: "blocksTargeting", value: true },
        layer: "unitAbility",
        perspective: "defender",
    }) as unknown as TaggedMechanic;

const noMods: ResolvedModifiers = new Map();

describe("resolveTargetEligibility", () => {
    it("is ineligible when hidden and range exceeds detection (default 15)", () => {
        const r = resolveTargetEligibility([hiddenMech()], ctx(20), noMods);
        expect(r.eligible).toBe(false);
        expect(r.reason).toBe("Hidden");
    });

    it("is eligible when within detection range", () => {
        expect(resolveTargetEligibility([hiddenMech()], ctx(10), noMods).eligible).toBe(true);
    });

    it("is eligible when range is unknown (undefined)", () => {
        expect(resolveTargetEligibility([hiddenMech()], ctx(undefined), noMods).eligible).toBe(true);
    });

    it("is eligible when no blocksTargeting mechanic is present", () => {
        expect(resolveTargetEligibility([], ctx(20), noMods).eligible).toBe(true);
    });

    it("respects a detectionRange staticNumber modifier", () => {
        const mods: ResolvedModifiers = new Map([["detectionRange", { staticNumber: 25, sources: [] }]]);
        expect(resolveTargetEligibility([hiddenMech()], ctx(20), mods).eligible).toBe(true);
    });

    it("uses the datasheet detectionRange when present", () => {
        // detectionRange 12, range 14 -> beyond -> ineligible
        expect(resolveTargetEligibility([hiddenMech()], ctx(14, 12), noMods).eligible).toBe(false);
    });
});
```

- [ ] **Step 4: Run — expect fail**

Run: `npx vitest run app/engine/resolvers/__tests__/eligibilityResolver.test.ts`
Expected: FAIL — module `../eligibilityResolver` does not exist.

- [ ] **Step 5: Write the resolver**

```ts
// app/engine/resolvers/eligibilityResolver.ts
import { CombatContext } from "@/app/types/CombatContext";
import { TargetEligibility } from "@/app/types/CombatResult";
import { ResolvedModifiers } from "@/app/types/ResolvedModifiers";
import { TaggedMechanic } from "../collectors/collectAllMechanics";
import { resolveEntity } from "./entityResolver";

const DEFAULT_DETECTION_RANGE = 15;

export const resolveTargetEligibility = (
    mechanics: TaggedMechanic[],
    context: CombatContext,
    modifiers: ResolvedModifiers,
): TargetEligibility => {
    const range = context.rangeToTarget;
    if (range == null) return { eligible: true, reason: null };

    for (const { mechanic, perspective } of mechanics) {
        if (mechanic.effect !== "blocksTargeting") continue;

        const owner = resolveEntity(mechanic.entity, context, perspective).unit;
        const base = Number(
            owner.models[0]?.detectionRange ?? DEFAULT_DETECTION_RANGE,
        );

        const mods = modifiers.get("detectionRange");
        const detection =
            mods?.staticNumber != null
                ? mods.staticNumber
                : base + (mods?.rollBonus ?? 0) - (mods?.rollPenalty ?? 0);

        if (range > detection) {
            return { eligible: false, reason: mechanic.name };
        }
    }

    return { eligible: true, reason: null };
};
```

- [ ] **Step 6: Run — expect pass, then typecheck**

Run: `npx vitest run app/engine/resolvers/__tests__/eligibilityResolver.test.ts` → PASS (6).
Run: `npx tsc --noEmit 2>&1 | grep "error TS" | grep -v operatorEvaluator` → **no output** (only pre-existing errors remain).

Note: `tsc` will flag that `runCombat` doesn't yet supply `eligibility` on its returned `CombatResult` — that is fixed in Task 3. If that is the only new error, proceed; otherwise fix the offending type first.

- [ ] **Step 7: Commit** (on the user's go-ahead)

```bash
git add app/types/Mechanic.ts app/types/State.ts app/types/Test.ts app/types/CombatContext.ts app/types/CombatResult.ts app/engine/resolvers/stateResolver.ts app/engine/resolvers/eligibilityResolver.ts app/engine/resolvers/__tests__/eligibilityResolver.test.ts
git commit -m "feat(engine): add blocksTargeting effect, detectionRange attribute, and target-eligibility resolver"
```

---

### Task 3: Wire Hidden end-to-end

**Files:**
- Modify: `app/engine/resolvers/conditionResolver.ts` (unit map += `detectionRange`)
- Modify: `app/engine/resolvers/targetResolver.ts` (`ATTRIBUTE_SIDE` += `detectionRange`)
- Modify: `app/engine/pipeline/buildCombatContext.ts` (thread `rangeToTarget`)
- Modify: `app/engine/pipeline/runCombat.ts` (call resolver, return `eligibility`)
- Modify: `app/library/combat-states/hidden.json` (the rule)
- Modify: `app/engine/collectors/collectCoreRuleMechanics.ts` (inject `hidden.json`)
- Test: `app/engine/pipeline/__tests__/runCombat.hidden.test.ts` (create)

**Interfaces:**
- Consumes: `resolveTargetEligibility` (Task 2), `includesAny` (Task 1).
- Produces: `runCombat` returns a `CombatResult` whose `eligibility` reflects Hidden.

- [ ] **Step 1: Add `detectionRange` to the condition unit map** (`conditionResolver.ts`, in `resolveAttribute`'s `unitMap`)

```ts
        objectiveControl: "oc",
        detectionRange: "detectionRange",
```

- [ ] **Step 2: Add `detectionRange` to `filterByTarget`** (`targetResolver.ts`, in `ATTRIBUTE_SIDE`)

```ts
    invulnSave: "defender",
    feelNoPain: "defender",
    detectionRange: "defender",
```

- [ ] **Step 3: Thread `rangeToTarget` through `buildCombatContext.ts`**

Add `rangeToTarget?: number;` to `BuildCombatContextParams`, and in the returned object:
```ts
        engagementPhase: params.engagementPhase,
        rangeToTarget: params.rangeToTarget,
```

- [ ] **Step 4: Redefine `hidden.json`**

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

- [ ] **Step 5: Inject it in `collectCoreRuleMechanics.ts`**

Add the import and push it unconditionally (its conditions gate application):
```ts
import hidden from "@/app/library/combat-states/hidden.json";
```
and inside `collectCoreRuleMechanics`, before `return results;`:
```ts
    results.push({
        mechanic: hidden as unknown as Mechanic,
        layer: "unitAbility",
        perspective: "defender",
    });
```

- [ ] **Step 6: Call the resolver in `runCombat.ts`**

Add the import:
```ts
import { resolveTargetEligibility } from "../resolvers/eligibilityResolver";
```
After `const resolved = resolveEffects(targetedMechanics, overrideSources);`:
```ts
    const eligibility = resolveTargetEligibility(targetedMechanics, context, resolved);
```
And add `eligibility` to the returned object:
```ts
        feelNoPain,
        eligibility,
    };
```

- [ ] **Step 7: Write the integration test**

```ts
// app/engine/pipeline/__tests__/runCombat.hidden.test.ts
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

// Infernus has the INFANTRY keyword. Build a defender with chosen state.
const defender = (opts: {
    isHidden?: boolean;
    isInCover?: boolean;
    keywords?: { keyword: string }[];
}): TestUnit => {
    const base = infernusSquad as unknown as TestUnit;
    return {
        ...base,
        keywords: opts.keywords ?? base.keywords,
        combatState: {
            ...base.combatState,
            isHidden: opts.isHidden ?? false,
            isInCover: opts.isInCover ?? false,
        },
    } as unknown as TestUnit;
};

const shoot = (d: TestUnit, rangeToTarget?: number) =>
    runCombat(
        buildCombatContext({
            attacker,
            defender: d,
            weaponProfile: heavyBoltRifle,
            engagementPhase: "shooting",
            rangeToTarget,
        }),
    );

describe("runCombat — Hidden targeting eligibility", () => {
    it("is INELIGIBLE when hidden + in cover + INFANTRY and beyond 15in", () => {
        const r = shoot(defender({ isHidden: true, isInCover: true }), 20);
        expect(r.eligibility.eligible).toBe(false);
        expect(r.eligibility.reason).toBe("Hidden");
    });

    it("is eligible within 15in", () => {
        expect(shoot(defender({ isHidden: true, isInCover: true }), 10).eligibility.eligible).toBe(true);
    });

    it("is eligible when not hidden (in cover + keyword, but shot)", () => {
        expect(shoot(defender({ isHidden: false, isInCover: true }), 20).eligibility.eligible).toBe(true);
    });

    it("is eligible when not in cover", () => {
        expect(shoot(defender({ isHidden: true, isInCover: false }), 20).eligibility.eligible).toBe(true);
    });

    it("is eligible when the unit lacks a qualifying keyword", () => {
        const noKw = defender({ isHidden: true, isInCover: true, keywords: [{ keyword: "VEHICLE" }] as { keyword: string }[] });
        expect(shoot(noKw, 20).eligibility.eligible).toBe(true);
    });

    it("still computes the attack phases when ineligible", () => {
        const r = shoot(defender({ isHidden: true, isInCover: true }), 20);
        expect(r.hitPhase.targetRoll).toBeTypeOf("number");
    });
});
```

- [ ] **Step 8: Run the new test, then full suite + typecheck**

Run: `npx vitest run app/engine/pipeline/__tests__/runCombat.hidden.test.ts` → PASS (6).
Run: `npx vitest run` → all pass (existing 165 + Task 1/2/3 additions).
Run: `npx tsc --noEmit 2>&1 | grep "error TS" | sed 's/(.*//' | sort | uniq -c` → only the pre-existing `operatorEvaluator` entries.

Note: the Infernus `keywords` shape is `{ keyword, model, isFactionKeyword }`; the test only sets `keyword`, which is all `conditionResolver` reads (`k.keyword`). Confirm Infernus actually carries an INFANTRY keyword; if not, add `keywords: [{ keyword: "INFANTRY" }]` in the hidden/eligible cases.

- [ ] **Step 9: Commit** (on the user's go-ahead)

```bash
git add app/engine/resolvers/conditionResolver.ts app/engine/resolvers/targetResolver.ts app/engine/pipeline/buildCombatContext.ts app/engine/pipeline/runCombat.ts app/library/combat-states/hidden.json app/engine/collectors/collectCoreRuleMechanics.ts app/engine/pipeline/__tests__/runCombat.hidden.test.ts
git commit -m "feat(engine): wire Hidden targeting-eligibility end-to-end"
```

---

### Task 4: UI — Hidden toggle, range field, invalid-target flag

**Files:**
- Modify: `app/ui/modules/Engagements/Octagon.tsx`

**Interfaces:**
- Consumes: `CombatState.isHidden`, `CombatContext.rangeToTarget`, `CombatResult.eligibility`.

- [ ] **Step 1: Add the Hidden toggle to `CombatStatePanel`**

Next to the Cover `StateBoolRow` (search `label="Cover"`), add:
```tsx
                <StateBoolRow
                    label="Hidden"
                    value={state.isHidden}
                    onChange={(v) => update("isHidden", v)}
                />
```

- [ ] **Step 2: Add a range input + thread it into the context**

Near the phase/weapon controls in the main component, add engagement state:
```tsx
    const [rangeToTarget, setRangeToTarget] = useState<number | undefined>(undefined);
```
Render a text field (mirroring existing control styling):
```tsx
    <label className="text-blockcaps-xs text-skarsnikGreen/60">
        Range to target (in)
        <input
            type="number"
            value={rangeToTarget ?? ""}
            onChange={(e) =>
                setRangeToTarget(e.target.value === "" ? undefined : Number(e.target.value))
            }
        />
    </label>
```
In the `result` `useMemo`, pass it and add it to the dependency array:
```tsx
        const context = buildCombatContext({
            attacker,
            defender,
            weaponProfile: profile,
            engagementPhase: phase,
            rangeToTarget,
        });
```
```tsx
    }, [attacker, defender, selectedProfile, selectedWeapon, phase, weaponRestrictions, weaponIndex, rangeToTarget]);
```

- [ ] **Step 3: Show the invalid-target flag on the results panel**

At the top of the Results block (search the `Results` header), before the `PhaseRow`s:
```tsx
    {result.eligibility && !result.eligibility.eligible && (
        <div className="p-3 border border-red-500/60 text-red-400 text-blockcaps-xs">
            ✕ Not a valid target — {result.eligibility.reason} beyond detection range
        </div>
    )}
```
(Match the panel's existing class conventions; the red border/text is illustrative.)

- [ ] **Step 4: Typecheck + manual verification**

Run: `npx tsc --noEmit 2>&1 | grep -i octagon` → no output.
Then drive the dev server (`npm run dev`, `/test-lab`): Heavy Intercessor (heavy bolt rifle) vs **Infernus** (defender, INFANTRY). Toggle **Cover** and **Hidden** on, set **Range** to 20 → the invalid-target banner appears; set Range to 10 → it clears; untick **Hidden** (or Cover) at range 20 → it clears. Confirms all gates + the range check in the real UI.

- [ ] **Step 5: Commit** (on the user's go-ahead)

```bash
git add app/ui/modules/Engagements/Octagon.tsx
git commit -m "feat(ui): Hidden toggle, range-to-target field, and invalid-target flag"
```

---

## Self-Review

**Spec coverage:** `isHidden` state + toggle (T2, T4) · `rangeToTarget` context + field (T2, T3, T4) · `detectionRange` modifiable attribute w/ default 15 (T2, T3) · `blocksTargeting` (T2) · `includesAny` (T1) · `resolveTargetEligibility` + `CombatResult.eligibility` (T2) · `hidden.json` rule w/ all three gates (T3) · injection (T3) · eligibility runs after `resolveEffects` (T3 step 6) · UI flag (T4). Deferred items (`distanceToTarget`/Melta/RapidFire, Lone Operative, detection-range abilities, pipeline field) are not scoped here — matches the spec.

**Placeholder scan:** every code step has concrete code and commands. No TBD.

**Type consistency:** `TargetEligibility` defined once in `CombatResult.ts` and imported by the resolver; `resolveTargetEligibility(mechanics, context, modifiers)` signature identical in T2 (def) and T3 (call); `detectionRange` added to the `UnitAttribute` union (T2), the condition unit map (T3), and `ATTRIBUTE_SIDE` (T3) consistently; `blocksTargeting`/`includesAny` added to their unions before first use.
