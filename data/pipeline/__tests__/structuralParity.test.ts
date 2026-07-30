import { describe, it, expect } from "vitest";
import { transformDatasheet } from "../transformDatasheet";
import type { RawDatasheet } from "../types";
import wtpSource from "@/data/src/factions/tyranids/datasheets/000002694.json";

// The pipeline's basic output for a known unit (Winged Tyranid Prime) should
// structurally match the codex example — excluding the deferred fields
// (combatState, ability mechanics, parsed loadouts).
describe("pipeline structural parity (WTP, basics)", () => {
    const { datasheet: d } = transformDatasheet(
        wtpSource as unknown as RawDatasheet,
    );

    it("has the expected top-level basic keys", () => {
        for (const k of [
            "id", "name", "slug", "legend", "faction", "source", "role",
            "isForgeWorld", "isLegends", "leader", "keywords", "transport",
            "damaged", "wargear", "supplement", "models", "pointsCosts",
            "abilities", "unitComposition",
        ]) {
            expect(d).toHaveProperty(k);
        }
    });

    it("emits unitComposition with parsed counts and no datasheetId", () => {
        expect(d.unitComposition).toEqual([
            {
                line: 1,
                description: "1 Winged Tyranid Prime",
                min: 1,
                max: 1,
            },
        ]);
    });

    it("parses the model statline to numbers", () => {
        const m = (d.models as Record<string, number>[])[0];
        expect(m).toMatchObject({ m: 12, t: 5, sv: 4, w: 6, ld: 7, oc: 1 });
    });

    it("builds leader.canLead from source", () => {
        const leader = d.leader as { canLead: unknown[] };
        expect(leader.canLead.length).toBeGreaterThan(0);
    });

    it("reduces Core abilities to name+type shells and derives Datasheet mechanics", () => {
        const abilities = d.abilities as Record<string, unknown>[];
        const core = abilities.find((a) => a.name === "Deep Strike");
        expect(core).toEqual({
            id: "000008343",
            name: "Deep Strike",
            type: "Core",
        });

        const ds = abilities.find((a) => a.name === "Alpha Warrior");
        expect(ds?.type).toBe("Datasheet");
        expect(ds?.description).toBeTruthy();

        // "While this model is leading a unit, weapons equipped by models in that
        // unit have the [SUSTAINED HITS 1] ability." — the grant and its leading
        // condition are both extracted.
        expect(ds?.mechanicsSource).toBe("regex");
        expect(ds?.mechanics).toEqual([
            {
                name: "Alpha Warrior",
                entity: "thisUnit",
                effect: "addsWeaponAttribute",
                weaponAttributes: ["SUSTAINED HITS"],
                value: 1,
                conditions: [
                    {
                        entity: "thisUnit",
                        state: "isLeadingUnit",
                        operator: "equals",
                        value: true,
                    },
                ],
            },
        ]);
    });

    it("does not emit combatState (runtime, deferred)", () => {
        expect(d).not.toHaveProperty("combatState");
    });
});
