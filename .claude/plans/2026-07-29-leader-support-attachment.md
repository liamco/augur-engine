# Leader + Support Attachment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a unit have one Leader and one Support character attached at once, each conferring its bonuses, via a shared testable `attachCharacters` util and a two-slot UI.

**Architecture:** Add a `support` datasheet property mirroring `leader`. Replace the UI-private `attachLeader` with an engine util `attachCharacters(base, { leader?, support? })` that confers each character's mechanic-bearing abilities (flagged `isConferred`) and sets core-unit-perspective flags `hasAttachedLeader` / `hasAttachedSupport`. Conferred abilities gate on those flags.

**Tech Stack:** TypeScript, Vitest, Next.js.

## Global Constraints

- **Commits are user-gated:** do NOT commit automatically.
- **Behaviour-preserving where noted:** the existing suite (currently 193) stays green; `tsc --noEmit` shows only the 8 pre-existing `operatorEvaluator` errors.
- **Test runner:** `npx vitest run [path]`.
- Conferral flags live in `combatState.customState` (dynamic keys), resolved by `stateResolver`'s existing customState fallback — **no `stateResolver` change**.

---

### Task 1: Foundation — `support` type + honest renames

**Files:**
- Modify: `app/types/Test.ts` (add `TestSupportInfo` + `TestUnit.support`)
- Modify: `app/types/Ability.ts` (`isFromLeader` → `isConferred`)
- Rename: `app/engine/collectors/collectLeaderMechanics.ts` → `collectConferredMechanics.ts` (+ internal read of `isConferred`)
- Modify: `app/engine/collectors/collectUnitMechanics.ts` (skip `isConferred`), `app/engine/collectors/collectAllMechanics.ts` (import), `app/ui/modules/Engagements/Octagon.tsx` (`attachLeader` sets `isConferred`)

**Interfaces:**
- Produces: `TestUnit.support: TestSupportInfo | null`; `Ability.isConferred?: boolean`; `collectConferredMechanics(context)`.

- [ ] **Step 1: Find every reference to rename**

Run: `grep -rn "isFromLeader\|collectLeaderMechanics" app` — expect: `Ability.ts`, `collectLeaderMechanics.ts`, `collectUnitMechanics.ts`, `collectAllMechanics.ts`, `Octagon.tsx` (attachLeader). Confirm `isFromLeader` appears in **no** `.json` (it's runtime-only). If any JSON has it, add that file to the edit list.

- [ ] **Step 2: Add the `support` type** (`app/types/Test.ts`, next to `TestLeaderInfo`)

```ts
interface TestSupportInfo {
    canSupport: TestDatasheetReference[];
    supportNotes: string;
}
```
and add to `TestUnit` (beside `leader`):
```ts
    support: TestSupportInfo | null;
```

- [ ] **Step 3: Rename `isFromLeader` → `isConferred`**

- `app/types/Ability.ts`: `isFromLeader?: boolean;` → `isConferred?: boolean;`
- `app/engine/collectors/collectUnitMechanics.ts`: `if (ability.isFromLeader) continue;` → `if (ability.isConferred) continue;`
- `app/ui/modules/Engagements/Octagon.tsx` (in `attachLeader`): `isFromLeader: true as const,` → `isConferred: true as const,`

- [ ] **Step 4: Rename the collector**

Rename the file `collectLeaderMechanics.ts` → `collectConferredMechanics.ts`; rename the export `collectLeaderMechanics` → `collectConferredMechanics`; change its inner `if (!ability.isFromLeader) continue;` → `if (!ability.isConferred) continue;` (keep `layer: "leaderAbility"`). In `collectAllMechanics.ts`, update the import and the call.

- [ ] **Step 5: Verify behaviour unchanged**

Run: `npx vitest run` → all pass (193).
Run: `npx tsc --noEmit 2>&1 | grep "error TS" | grep -v operatorEvaluator` → no output.

- [ ] **Step 6: Commit** (on the user's go-ahead)

```bash
git add app/types/Test.ts app/types/Ability.ts app/engine/collectors/collectConferredMechanics.ts app/engine/collectors/collectUnitMechanics.ts app/engine/collectors/collectAllMechanics.ts app/ui/modules/Engagements/Octagon.tsx
git rm app/engine/collectors/collectLeaderMechanics.ts  # if the rename left the old file
git commit -m "refactor(engine): add support datasheet type; rename isFromLeader->isConferred"
```

---

### Task 2: `attachCharacters` util + unit tests

**Files:**
- Create: `app/engine/pipeline/attachCharacters.ts`
- Test: `app/engine/pipeline/__tests__/attachCharacters.test.ts`

**Interfaces:**
- Produces: `attachCharacters(base: TestUnit, chars: { leader?: TestUnit | null; support?: TestUnit | null }): TestUnit` — appends each present character's mechanic-bearing abilities (flagged `isConferred` + `sourceUnitName`) and sets `hasAttachedLeader` / `hasAttachedSupport` in `customState`.

- [ ] **Step 1: Write the failing tests**

```ts
// app/engine/pipeline/__tests__/attachCharacters.test.ts
import { describe, it, expect } from "vitest";
import { attachCharacters } from "../attachCharacters";
import { TestUnit } from "@/app/types/Test";

const withMech = { entity: "thisUnit", effect: "rollBonus", attribute: "hit", value: 1 };

const unit = (name: string, abilities: unknown[]): TestUnit =>
    ({ name, abilities, combatState: { customState: {} } }) as unknown as TestUnit;

const base = () => unit("Base", []);
const leader = unit("Ldr", [
    { name: "L", type: "Datasheet", mechanics: [withMech] },
    { name: "NoMech", type: "Datasheet" }, // no mechanics -> not conferred
]);
const support = unit("Sup", [{ name: "S", type: "Datasheet", mechanics: [withMech] }]);

const cs = (u: TestUnit) => u.combatState.customState ?? {};

describe("attachCharacters", () => {
    it("leader only sets hasAttachedLeader and confers the leader's mechanic abilities", () => {
        const r = attachCharacters(base(), { leader });
        expect(cs(r).hasAttachedLeader).toBe(true);
        expect(cs(r).hasAttachedSupport).toBeUndefined();
        const conferred = r.abilities.filter((a) => a.isConferred);
        expect(conferred).toHaveLength(1);
        expect(conferred[0].sourceUnitName).toBe("Ldr");
    });

    it("support only sets hasAttachedSupport", () => {
        const r = attachCharacters(base(), { support });
        expect(cs(r).hasAttachedSupport).toBe(true);
        expect(cs(r).hasAttachedLeader).toBeUndefined();
    });

    it("both sets both flags and confers both", () => {
        const r = attachCharacters(base(), { leader, support });
        expect(cs(r).hasAttachedLeader).toBe(true);
        expect(cs(r).hasAttachedSupport).toBe(true);
        expect(r.abilities.filter((a) => a.isConferred)).toHaveLength(2);
    });

    it("neither returns the base unchanged", () => {
        const b = base();
        const r = attachCharacters(b, {});
        expect(r.abilities.filter((a) => a.isConferred)).toHaveLength(0);
        expect(cs(r).hasAttachedLeader).toBeUndefined();
    });
});
```

- [ ] **Step 2: Run — expect fail** (`../attachCharacters` missing)

Run: `npx vitest run app/engine/pipeline/__tests__/attachCharacters.test.ts` → FAIL.

- [ ] **Step 3: Implement the util**

```ts
// app/engine/pipeline/attachCharacters.ts
import { TestUnit } from "@/app/types/Test";

type AttachFlag = "hasAttachedLeader" | "hasAttachedSupport";

const mergeCharacter = (
    unit: TestUnit,
    character: TestUnit,
    flag: AttachFlag,
): TestUnit => {
    const conferred = character.abilities
        .filter((a) => a.mechanics && a.mechanics.length > 0)
        .map((a) => ({
            ...a,
            isConferred: true as const,
            sourceUnitName: character.name,
        }));

    return {
        ...unit,
        abilities: [...unit.abilities, ...conferred],
        combatState: {
            ...unit.combatState,
            customState: {
                ...unit.combatState.customState,
                [flag]: true,
            },
        },
    };
};

export const attachCharacters = (
    base: TestUnit,
    chars: { leader?: TestUnit | null; support?: TestUnit | null },
): TestUnit => {
    let unit = base;
    if (chars.leader) unit = mergeCharacter(unit, chars.leader, "hasAttachedLeader");
    if (chars.support) unit = mergeCharacter(unit, chars.support, "hasAttachedSupport");
    return unit;
};
```

- [ ] **Step 4: Run — expect pass**

Run: `npx vitest run app/engine/pipeline/__tests__/attachCharacters.test.ts` → PASS (4).

- [ ] **Step 5: Commit** (on the user's go-ahead)

```bash
git add app/engine/pipeline/attachCharacters.ts app/engine/pipeline/__tests__/attachCharacters.test.ts
git commit -m "feat(engine): attachCharacters util (leader + support conferral)"
```

---

### Task 3: Migrate data flags + both-slots integration test

**Files:**
- Modify: `app/data/output/winged-tyranid-prime.json`, `app/data/output/librarian-in-terminator-armour.json` (`isLeadingUnit` → `hasAttachedLeader` in ability conditions)
- Test: `app/engine/pipeline/__tests__/runCombat.attachments.test.ts` (create)

- [ ] **Step 1: Migrate existing conditions**

Run `grep -rn "isLeadingUnit" app/data` and replace each condition's `"state": "isLeadingUnit"` with `"state": "hasAttachedLeader"` (WTP *Alpha Warrior*; Librarian *Psychic Hood* and *Veil of Time*). These are Leader-conferred abilities, so `hasAttachedLeader` is correct.

- [ ] **Step 2: Write the failing integration test**

```ts
// app/engine/pipeline/__tests__/runCombat.attachments.test.ts
import { describe, it, expect } from "vitest";
import { buildCombatContext } from "../buildCombatContext";
import { runCombat } from "../runCombat";
import { attachCharacters } from "../attachCharacters";
import { TestUnit } from "@/app/types/Test";
import { WeaponProfile } from "@/app/types/Weapon";
import heavyIntercessors from "@/app/data/output/heavy-intercessor-squad.json";
import infernusSquad from "@/app/data/output/infernus-squad.json";

const gun: WeaponProfile = {
    datasheetId: "x", line: 1, name: "Gun", type: "Ranged",
    attributes: [], range: 24, a: 2, bsWs: 3, s: 4, ap: 0, d: 1,
};

const character = (name: string, mech: object): TestUnit =>
    ({ name, abilities: [{ name, type: "Datasheet", mechanics: [mech] }] }) as unknown as TestUnit;

// Leader: +1 to hit while a Leader is attached.
const leader = character("Ldr", {
    entity: "thisUnit", effect: "rollBonus", attribute: "hit", value: 1,
    conditions: [{ entity: "thisUnit", state: "hasAttachedLeader", operator: "equals", value: true }],
});
// Support: +1 attack while a Support is attached.
const support = character("Sup", {
    entity: "thisUnit", effect: "staticNumber", attribute: "attacks", value: 1,
    conditions: [{ entity: "thisUnit", state: "hasAttachedSupport", operator: "equals", value: true }],
});

const base = heavyIntercessors as unknown as TestUnit;
const defender = infernusSquad as unknown as TestUnit;

const shoot = (attacker: TestUnit) =>
    runCombat(buildCombatContext({ attacker, defender, weaponProfile: gun, engagementPhase: "shooting" }));

describe("runCombat — leader + support attachment", () => {
    const none = () => shoot(base);
    const withLeader = () => shoot(attachCharacters(base, { leader }));
    const withSupport = () => shoot(attachCharacters(base, { support }));
    const withBoth = () => shoot(attachCharacters(base, { leader, support }));

    it("leader confers its bonus (better hit), support does not affect hit", () => {
        expect(withLeader().hitPhase.targetRoll!).toBeLessThan(none().hitPhase.targetRoll!);
        expect(withSupport().hitPhase.targetRoll).toBe(none().hitPhase.targetRoll);
    });

    it("support confers its bonus (more attacks), leader does not affect attacks", () => {
        expect(withSupport().attackCount.modifiedValue).toBeGreaterThan(none().attackCount.modifiedValue);
        expect(withLeader().attackCount.modifiedValue).toBe(none().attackCount.modifiedValue);
    });

    it("both slots confer simultaneously", () => {
        const b = withBoth();
        expect(b.hitPhase.targetRoll!).toBeLessThan(none().hitPhase.targetRoll!);
        expect(b.attackCount.modifiedValue).toBeGreaterThan(none().attackCount.modifiedValue);
    });
});
```

- [ ] **Step 3: Run — expect pass** (util + collector already in place from Tasks 1–2)

Run: `npx vitest run app/engine/pipeline/__tests__/runCombat.attachments.test.ts` → PASS (3). If red, the fault is real — trace before adjusting the test.

- [ ] **Step 4: Full suite + typecheck**

Run: `npx vitest run` → all pass. `npx tsc --noEmit 2>&1 | grep "error TS" | grep -v operatorEvaluator` → no output.

- [ ] **Step 5: Commit** (on the user's go-ahead)

```bash
git add app/data/output/winged-tyranid-prime.json app/data/output/librarian-in-terminator-armour.json app/engine/pipeline/__tests__/runCombat.attachments.test.ts
git commit -m "feat: migrate leader flag to hasAttachedLeader; test leader+support conferral"
```

---

### Task 4: Wire the two-slot UI

**Files:**
- Modify: `app/ui/modules/Engagements/Octagon.tsx`

**Interfaces:**
- Consumes: `attachCharacters` (Task 2).

The leader wiring already exists; **mirror each leader piece for support**, and swap the assembly to `attachCharacters`. Remove the private `attachLeader` function.

- [ ] **Step 1: Import the util, delete `attachLeader`**

Add `import { attachCharacters } from "@/app/engine/pipeline/attachCharacters";` and delete the local `function attachLeader(...)` (~lines 1021-1041).

- [ ] **Step 2: Add support state, mirroring leader state**

Beside `attackerLeaderIndex` / `defenderLeaderIndex`:
```tsx
    const [attackerSupportIndex, setAttackerSupportIndex] = useState<number | null>(null);
    const [defenderSupportIndex, setDefenderSupportIndex] = useState<number | null>(null);
```

- [ ] **Step 3: Add support options, mirroring `attackerLeaderOptions`/`defenderLeaderOptions`**

For each side, add a memo identical to the leader-options memo but reading `entry.data.support?.canSupport` instead of `entry.data.leader?.canLead`. Example (attacker):
```tsx
    const attackerSupportOptions = useMemo(() => {
        if (!attackerBase) return [];
        return unitManifest
            .map((entry, index) => ({ entry, index }))
            .filter(({ entry }) =>
                entry.data.support?.canSupport.some((ref) => ref.id === attackerBase.id),
            );
    }, [attackerBase]);
```
(and `defenderSupportOptions` the same for `defenderBase`).

- [ ] **Step 4: Resolve selected support + assemble via `attachCharacters`**

Add `selectedAttackerSupport`/`selectedDefenderSupport` mirroring `selectedAttackerLeader`/`selectedDefenderLeader`, then replace the `attachLeader` assembly (~lines 88-98):
```tsx
    const attacker =
        attackerWithState
            ? attachCharacters(attackerWithState, {
                  leader: selectedAttackerLeader,
                  support: selectedAttackerSupport,
              })
            : attackerWithState;
    const defender =
        defenderWithState
            ? attachCharacters(defenderWithState, {
                  leader: selectedDefenderLeader,
                  support: selectedDefenderSupport,
              })
            : defenderWithState;
```

- [ ] **Step 5: Reset support index on base change**

In `handleAttackerChange` / `handleDefenderChange`, add `setAttackerSupportIndex(null)` / `setDefenderSupportIndex(null)` alongside the existing leader-index reset.

- [ ] **Step 6: Add the "Attached Support" dropdown + handlers**

Add `handleAttackerSupportChange` / `handleDefenderSupportChange` mirroring the leader handlers, and render a second `SelectGroup label="Attached Support"` beside each existing "Attached Leader" block, gated on `…SupportOptions.length > 0`, mapping `…SupportOptions`.

- [ ] **Step 7: Typecheck + lab verification**

Run: `npx tsc --noEmit 2>&1 | grep -i octagon` → no output. `npx vitest run` → 193 + Task 2/3 additions, all pass.
Then, with the new Support test data in the manifest, drive `/test-lab`: pick a base unit that a Support character lists in `canSupport`; confirm both an "Attached Leader" and an "Attached Support" can be selected independently (one each) and both sets of bonuses/tags appear.

- [ ] **Step 8: Commit** (on the user's go-ahead)

```bash
git add app/ui/modules/Engagements/Octagon.tsx
git commit -m "feat(ui): Leader + Support attachment slots"
```

---

## Self-Review

**Spec coverage:** `support` type (T1) · `hasAttachedLeader`/`hasAttachedSupport` core-unit flags set by `attachCharacters` (T2), existing data migrated to `hasAttachedLeader` (T3) · `isConferred` rename + `collectConferredMechanics` (T1) · shared testable `attachCharacters` replacing UI `attachLeader` (T2, T4) · two-slot UI filtered by `canLead`/`canSupport`, one-of-each via independent selects (T4). Deferred items (co-attachment eligibility conditions, pipeline `support` emission, per-role source attribution) are not scoped — matches the spec.

**Placeholder scan:** every code step has full code or an explicit mirror instruction with a representative snippet; commands have expected output.

**Type consistency:** `attachCharacters(base, { leader?, support? })` signature identical across T2 (def), T3 & T4 (calls); `isConferred` used consistently in `Ability`, `attachCharacters`, `collectConferredMechanics`, `collectUnitMechanics`; flag names `hasAttachedLeader`/`hasAttachedSupport` identical in the util, the migrated data, and the integration test.
