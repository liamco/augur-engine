# Datasheet Pipeline — Basics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `data/pipeline` the reliable, authoritative producer of the *basic* structural codex, and switch the app to consume its output (Decision A(a)).

**Architecture:** Harden the existing transforms (no `NaN`), validate output structurally against the codex example, regenerate all factions, then repoint the app at the pipeline output and delete the hand-curated flat files. Loadouts, mechanics, and `combatState` are explicitly deferred.

**Tech Stack:** TypeScript, Vitest, tsx.

## Global Constraints

- **Commits are user-gated.**
- **Accepted regression (signed off):** generated files carry no `mechanics` and no `combatState`. Lab combat is expected to break until the deferred mechanics + runtime-combatState steps. `runCombat` tests are kept green by supplying `combatState` inline in fixtures (their mechanics are library-driven, not unit-native).
- **Deferred (not this round):** loadout parsing; mechanics derivation; `createDefaultCombatState` runtime.
- Test runner `npx vitest run`; pipeline `npm run parse`; typecheck `npx tsc --noEmit` (only the pre-existing `operatorEvaluator` errors may remain).

---

### Task 1: Harden numeric parsing (models + costs)

**Files:**
- Modify: `data/pipeline/transforms/transformModels.ts`, `data/pipeline/transforms/transformCosts.ts`
- Test: `data/pipeline/transforms/__tests__/transformModels.test.ts`, `data/pipeline/transforms/__tests__/transformCosts.test.ts`

**Interfaces:** no signature change — `t`/`w`/`oc`/`cost` become guarded (a `-`/`""` yields `0`, never `NaN`).

- [ ] **Step 1: Write failing tests**

`transformModels.test.ts` — add:
```ts
it("defaults non-numeric t/w/oc to 0 instead of NaN", () => {
    const out = transformModels(
        [{ datasheetId: "x", line: "1", name: "M", m: '6"', t: "-", sv: "3+", invSv: "-", invSvDescr: "", w: "-", ld: "6+", oc: "-", baseSize: "", baseSizeDescr: "" }] as never,
        [{ datasheetId: "x", line: "1", description: "1 model" }] as never,
    );
    expect(out[0].t).toBe(0);
    expect(out[0].w).toBe(0);
    expect(out[0].oc).toBe(0);
});
```
`transformCosts.test.ts` — add:
```ts
it("defaults a non-numeric cost to 0", () => {
    expect(transformCosts([{ cost: "-", description: "1 model" }] as never)[0].cost).toBe(0);
});
```

- [ ] **Step 2: Run — expect fail** (`NaN` ≠ 0)

Run: `npx vitest run data/pipeline/transforms/__tests__/transformModels.test.ts data/pipeline/transforms/__tests__/transformCosts.test.ts`

- [ ] **Step 3: Guard the parses**

`transformModels.ts` — import `parseIntOrNull` (already imported) and replace:
```ts
            t: parseInt(model.t, 10),
            ...
            w: parseInt(model.w, 10),
            ...
            oc: parseInt(model.oc, 10),
```
with:
```ts
            t: parseIntOrNull(model.t) ?? 0,
            ...
            w: parseIntOrNull(model.w) ?? 0,
            ...
            oc: parseIntOrNull(model.oc) ?? 0,
```
`transformCosts.ts` — import and use the guard:
```ts
import { parseIntOrNull } from "../utils/parseStats";
...
        cost: parseIntOrNull(cost) ?? 0,
```

- [ ] **Step 4: Run — expect pass**, then the existing model/cost tests still pass.

- [ ] **Step 5: Commit** (on go-ahead)
```bash
git add data/pipeline/transforms/transformModels.ts data/pipeline/transforms/transformCosts.ts data/pipeline/transforms/__tests__/transformModels.test.ts data/pipeline/transforms/__tests__/transformCosts.test.ts
git commit -m "fix(pipeline): guard t/w/oc/cost parsing against non-numeric (no NaN)"
```

---

### Task 2: Structural parity check against the codex

**Files:**
- Test: `data/pipeline/__tests__/structuralParity.test.ts` (create)

**Interface:** consumes `transformDatasheet` (`data/pipeline/transformDatasheet.ts`) and the source WTP datasheet.

- [ ] **Step 1: Write the parity test**

Import the WTP source and run `transformDatasheet`; assert the in-scope keys/types match the codex example (deferred fields excluded):
```ts
import { describe, it, expect } from "vitest";
import { transformDatasheet } from "../transformDatasheet";
import wtpSource from "@/data/src/factions/tyranids/datasheets/000002694.json";

describe("pipeline structural parity (WTP, basics)", () => {
    const { datasheet: d } = transformDatasheet(wtpSource as never);

    it("has the expected top-level basic keys", () => {
        for (const k of ["id","name","slug","legend","faction","source","role","isForgeWorld","isLegends","leader","keywords","transport","damaged","wargear","supplement","models","pointsCosts","abilities"]) {
            expect(d).toHaveProperty(k);
        }
    });
    it("parses the model statline to numbers", () => {
        const m = (d.models as any[])[0];
        expect(m).toMatchObject({ m: 12, t: 5, sv: 4, w: 6, ld: 7, oc: 1 });
    });
    it("builds leader.canLead from source", () => {
        expect((d.leader as any).canLead.length).toBeGreaterThan(0);
    });
    it("reduces Core/Faction abilities to name+type shells and keeps Datasheet descriptions", () => {
        const abilities = d.abilities as any[];
        const core = abilities.find((a) => a.name === "Deep Strike");
        expect(core).toEqual({ name: "Deep Strike", type: "Core" });
        const ds = abilities.find((a) => a.name === "Alpha Warrior");
        expect(ds.type).toBe("Datasheet");
        expect(ds.description).toBeTruthy();
        expect(ds.mechanics).toEqual([]); // deferred
    });
    it("does NOT emit combatState (runtime, deferred)", () => {
        expect(d).not.toHaveProperty("combatState");
    });
});
```

- [ ] **Step 2: Run — fix any real mismatch** (a failure here is a genuine pipeline bug; trace before adjusting the test). Confirm the `@/data/*` import resolves; if not, use a relative path to `data/src/...`.

- [ ] **Step 3: Commit** (on go-ahead)
```bash
git add data/pipeline/__tests__/structuralParity.test.ts
git commit -m "test(pipeline): structural parity of basics output vs codex (WTP)"
```

---

### Task 3: Regenerate all factions; fix run-time breakage

**Files:** regenerated `app/codex/factions/**` + `app/codex/core-stratagems.json`; possibly `data/pipeline/index.ts` / `transforms/transformDetachments.ts` if the run surfaces a crash.

- [ ] **Step 1: Resolve the `tyranids_old` duplicate**

`data/src/factions/` contains both `tyranids/` and `tyranids_old/`. Confirm `tyranids/` is current (has `000002694` etc.); the pipeline walks every folder, so `tyranids_old/` would emit a stale `factions/tyranids_old/`. Either remove `tyranids_old/` from `data/src/factions/` (preferred — ask the user before deleting) or add it to an ignore list in `index.ts`'s faction walk. Do **not** delete source without the user's ok — if unsure, add an `IGNORE_FACTIONS = ["tyranids_old"]` skip in `index.ts`.

- [ ] **Step 2: Run the pipeline**

Run: `npm run parse`
Expected: completes with no error for space-marines, tyranids, necrons. If it throws (e.g. `transformDetachments` assuming `det.abilities[0]`), fix defensively — guard the access (`det.abilities?.[0]`, handle empty) and keep *all* detachment abilities, not just the first — then re-run.

- [ ] **Step 3: Verify the manifest units generated + spot-check**

Confirm each of the 7 manifest units exists as `app/codex/factions/{slug}/datasheets/{id}.json`:
`000001177, 000000126, 000000079` (space-marines); `000002694, 000000468, 000000484, 000002689` (tyranids).
Run: `grep -l "NaN" app/codex/factions/**/datasheets/*.json` → **no matches** (no NaN leaked). Spot-check WTP output vs the codex example structurally.

- [ ] **Step 4: Commit** (on go-ahead)
```bash
git add app/codex/factions data/pipeline
git commit -m "chore(codex): regenerate all faction datasheets from source"
```

---

### Task 4: Switch the app to pipeline output (Decision A(a))

**Files:**
- Modify: `app/ui/modules/Engagements/unitManifest.ts`
- Delete: hand-curated flat `app/codex/{slug}.json` (7 unit files; keep `core-stratagems.json`; delete `exampleStructure.json` if unused)
- Modify: `app/engine/pipeline/__tests__/runCombat.*.test.ts` (fixture imports + inline combatState)
- Create: `app/engine/pipeline/__tests__/fixtures/combatState.ts` (test-only default combatState helper)

- [ ] **Step 1: Repoint `unitManifest`**

Change each import from the flat file to its nested pipeline file, e.g.:
```ts
import heavyIntercessors from "#codex/factions/space-marines/datasheets/000001177.json";
import infernusSquad from "#codex/factions/tyranids/datasheets/000000126.json"; // etc.
```
Map: heavy-intercessor→`space-marines/000001177`, infernus→`space-marines/000000126`, librarian→`space-marines/000000079`, winged-tyranid-prime→`tyranids/000002694`, termagants→`tyranids/000000468`, gargoyles→`tyranids/000000484`, psychophage→`tyranids/000002689`. Keep the `label`/`data` shape.

- [ ] **Step 2: Delete the hand-curated flat files**
```bash
git rm app/codex/winged-tyranid-prime.json app/codex/gargoyles.json app/codex/termagants.json app/codex/psychophage.json app/codex/heavy-intercessor-squad.json app/codex/infernus-squad.json app/codex/librarian-in-terminator-armour.json
# exampleStructure.json: remove only if grep shows nothing imports it
```

- [ ] **Step 3: Add a test-only default combatState helper**

```ts
// app/engine/pipeline/__tests__/fixtures/combatState.ts
import { CombatState } from "@/app/types/State";
// Minimal runtime combatState for tests, since the codex no longer carries it.
export const testCombatState = (over: Partial<CombatState> = {}): CombatState =>
    ({
        modelCount: 1, unitStrength: "full", deadModelIds: [], currentWounds: 1,
        movementBehaviour: "hold", chargeBehaviour: "hold",
        isDamaged: false, isDestroyed: false, isBattleShocked: false,
        isInEngagementRange: false, isInObjectiveRange: "none", isInCover: false,
        ...over,
    }) as CombatState;
```

- [ ] **Step 4: Update `runCombat.*.test.ts` fixtures**

For each test that builds an attacker/defender from a unit and relies on `combatState` (cover, stealth, hidden, targeting, rapidFire, psychic, grantedBonus): replace the `{ ...unit.combatState, ... }` spreads with `testCombatState({ ...overrides })` (e.g. `movementBehaviour: "hold"` for HEAVY-dependent hit numbers; `isInCover: true` for cover). Update the two `@/app/codex/*.json` fixture imports to the nested paths. These tests exercise **library-driven** mechanics (cover/stealth/weapon attributes) + test-provided abilities, so they stay green once combatState is supplied.

- [ ] **Step 5: Full suite + typecheck**

Run: `npx vitest run` — expected: green. If any test genuinely depended on **unit-native mechanics** (none currently do — all use library/fabricated mechanics), skip it with `it.skip(..., /* restored by mechanics follow-up */)` and note it. `npx tsc --noEmit` — only the pre-existing `operatorEvaluator` errors.

- [ ] **Step 6: Note the lab regression**

The `/test-lab` will not resolve combat correctly (no combatState/mechanics in data) until the follow-ups. This is the accepted A(a) regression — document it in the commit message; do **not** attempt to patch the lab here.

- [ ] **Step 7: Commit** (on go-ahead)
```bash
git add app/ui/modules/Engagements/unitManifest.ts app/engine/pipeline/__tests__/
git commit -m "feat(codex): app consumes pipeline output; retire hand-curated flat files (combat regresses until mechanics/combatState follow-ups)"
```

---

## Self-Review

**Spec coverage:** harden transforms (T1) · structural validation/parity (T2) · regenerate all factions + run-clean incl. tyranids_old + detachment guard (T3) · A(a) app switchover: unitManifest repoint, delete flat files, test-fixture updates (T4) · combatState/mechanics/loadouts explicitly deferred throughout. Matches the spec.

**Placeholder scan:** T1/T2/T4 have concrete code; T3 is procedural-by-necessity (regeneration) with explicit verification (no-NaN grep, manifest-unit existence) — the one genuinely run-and-fix task, flagged as such.

**Type consistency:** guards use the existing `parseIntOrNull` (returns `number|null`) with `?? 0` to satisfy `ParsedModel`/`ParsedCost` `number` fields; `unitManifest` keeps its `{label, data}` shape; `testCombatState` returns the full `CombatState` type.
