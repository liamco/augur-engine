import { describe, it, expect } from "vitest";
import {
    extractWargearAbilities,
    transformAbilities,
} from "../transformAbilities";
import type { RawAbility } from "../../types";

const ability = (
    name: string,
    type: string,
    description = "",
): RawAbility =>
    ({
        id: "",
        name,
        legend: "",
        factionId: "",
        description,
        type,
    }) as unknown as RawAbility;

describe("extractWargearAbilities", () => {
    it("pulls out Wargear-typed abilities and ids them per datasheet", () => {
        const result = extractWargearAbilities(
            [
                ability("Storm Shield", "Wargear", "The bearer has a 4+ invulnerable save."),
                ability("Oath of Moment", "Faction"),
            ],
            "000000118",
        );

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            id: "000000118:storm-shield",
            name: "Storm Shield",
            description: "The bearer has a 4+ invulnerable save.",
        });
    });

    it("extracts mechanics from the rules text, like any other ability", () => {
        const [shield] = extractWargearAbilities(
            [ability("Storm Shield", "Wargear", "The bearer has a 4+ invulnerable save.")],
            "d",
        );
        // Set, not added — resolveSaveRoll reads invulnSave now.
        expect(shield.mechanics).toEqual([
            {
                name: "Storm Shield",
                entity: "thisUnit",
                effect: "setsCharacteristic",
                attribute: "invulnSave",
                value: 4,
                conditions: [
                    {
                        entity: "thisUnit",
                        state: "startingModelCount",
                        operator: "equals",
                        value: 1,
                    },
                ],
            },
        ]);
        expect(shield.mechanicsSource).toBe("regex");
    });

    it("gates a bearer-scoped wargear ability on the unit being one model", () => {
        // A storm shield is carried by one model. Same reasoning as Enhancements.
        const [shield] = extractWargearAbilities(
            [ability("Storm Shield", "Wargear", "The bearer has a 4+ invulnerable save.")],
            "d",
        );
        expect(shield.mechanics[0].conditions).toHaveLength(1);
    });

    it("leaves a unit-scoped wargear ability ungated", () => {
        const [icon] = extractWargearAbilities(
            [
                ability(
                    "Banner of Macragge",
                    "Wargear",
                    "Each time a model in the bearer's unit makes a melee attack, add 1 to the Hit roll.",
                ),
            ],
            "d",
        );
        expect(icon.mechanics[0]?.conditions).toBeUndefined();
    });

    it("marks an unparseable one as unparsed rather than empty-but-claimed", () => {
        const [web] = extractWargearAbilities(
            [
                ability(
                    "Explorator Augury Web",
                    "Wargear",
                    "Enemy units set up as Reinforcements cannot be set up within 12\" of the bearer.",
                ),
            ],
            "d",
        );
        expect(web.mechanics).toEqual([]);
        expect(web.mechanicsSource).toBe("unparsed");
    });

    it("strips HTML from the description", () => {
        const [smoke] = extractWargearAbilities(
            [
                ability(
                    "Smoke Launchers",
                    "Wargear",
                    'The bearer gains the <span class="kwb">SMOKE</span> keyword.',
                ),
            ],
            "d",
        );
        expect(smoke.description).not.toContain("<span");
        expect(smoke.description).toContain("SMOKE");
    });

    it("returns nothing when a datasheet has no wargear abilities", () => {
        expect(extractWargearAbilities([ability("Deep Strike", "Core")], "d")).toEqual([]);
    });
});

describe("transformAbilities", () => {
    it("no longer emits Wargear abilities into the main list", () => {
        // They belong to wargear.abilities, read by collectWargearMechanics.
        // Leaving them here labelled "Datasheet" double-counted them and put a
        // model-scoped item on the unit.
        const result = transformAbilities([
            ability("Storm Shield", "Wargear", "The bearer has a 4+ invulnerable save."),
            ability("Angelic Visage", "Datasheet", "Add 1 to the Hit roll."),
        ]);
        expect(result.map((a) => a.name)).toEqual(["Angelic Visage"]);
    });

    it("still keeps Core, Faction and Datasheet abilities", () => {
        const result = transformAbilities([
            ability("Deep Strike", "Core"),
            ability("Oath of Moment", "Faction"),
            ability("Angelic Visage", "Datasheet", "Add 1 to the Hit roll."),
        ]);
        expect(result.map((a) => a.type)).toEqual([
            "Core",
            "Faction",
            "Datasheet",
        ]);
    });

    it('keeps "Wargear profile" abilities in the main list', () => {
        // "One Shot" annotates a weapon rather than being selectable wargear, so
        // it is not something a loadout can name.
        const result = transformAbilities([
            ability("One Shot", "Wargear profile", "Can only shoot once per battle."),
        ]);
        expect(result.map((a) => a.name)).toEqual(["One Shot"]);
    });
});
