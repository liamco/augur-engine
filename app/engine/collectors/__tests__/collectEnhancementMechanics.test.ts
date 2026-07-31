import { describe, it, expect } from "vitest";
import { collectEnhancementMechanics } from "../collectEnhancementMechanics";
import { CombatContext } from "@/app/types/CombatContext";
import { Mechanic } from "@/app/types/Mechanic";

const saveSet: Mechanic = {
    name: "Artificer Armour",
    entity: "thisUnit",
    effect: "setsCharacteristic",
    attribute: "save",
    value: 2,
};

const strengthBonus: Mechanic = {
    name: "War-tempered Artifice",
    entity: "thisUnit",
    effect: "staticNumber",
    attribute: "strength",
    value: 3,
};

const context = (
    attackerMechanics?: Mechanic[],
    defenderMechanics?: Mechanic[],
): CombatContext =>
    ({
        attacker: attackerMechanics
            ? { enhancement: { id: "a", name: "A", mechanics: attackerMechanics } }
            : {},
        defender: defenderMechanics
            ? { enhancement: { id: "d", name: "D", mechanics: defenderMechanics } }
            : {},
    }) as unknown as CombatContext;

describe("collectEnhancementMechanics", () => {
    it("collects the attacker's enhancement", () => {
        const results = collectEnhancementMechanics(context([strengthBonus]));
        expect(results).toEqual([
            {
                mechanic: strengthBonus,
                layer: "enhancement",
                perspective: "attacker",
            },
        ]);
    });

    it("collects the defender's enhancement", () => {
        // A defensive enhancement (Save 2+, invuln, FNP) is the common case, so
        // an attacker-only collector means the whole layer never fires on defence.
        const results = collectEnhancementMechanics(context(undefined, [saveSet]));
        expect(results).toEqual([
            {
                mechanic: saveSet,
                layer: "enhancement",
                perspective: "defender",
            },
        ]);
    });

    it("collects both sides at once, tagged by perspective", () => {
        const results = collectEnhancementMechanics(
            context([strengthBonus], [saveSet]),
        );
        expect(results.map((r) => r.perspective)).toEqual([
            "attacker",
            "defender",
        ]);
    });

    it("returns nothing when neither unit carries an enhancement", () => {
        expect(collectEnhancementMechanics(context())).toEqual([]);
    });

    it("returns nothing for an enhancement with no mechanics yet", () => {
        const ctx = {
            attacker: { enhancement: { id: "a", name: "A" } },
            defender: {},
        } as unknown as CombatContext;
        expect(collectEnhancementMechanics(ctx)).toEqual([]);
    });
});
