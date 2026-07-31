import { describe, it, expect } from "vitest";
import {
    ENGINE_CONSUMED_ATTRIBUTES,
    findInertAttributes,
    MECHANIC_VOCABULARY,
} from "../validate";
import type { Mechanic } from "@/app/types/Mechanic";

const mechanic = (attribute: Mechanic["attribute"]): Mechanic => ({
    name: "Test",
    entity: "thisUnit",
    effect: "staticNumber",
    attribute,
    value: 1,
});

describe("ENGINE_CONSUMED_ATTRIBUTES", () => {
    it("lists exactly the attributes a resolver reads from `resolved`", () => {
        // Kept in step by hand with the combat-phase resolvers. If a resolver
        // starts reading a new attribute, add it here — until then, emitting a
        // mechanic for it produces data that looks populated and does nothing.
        expect([...ENGINE_CONSUMED_ATTRIBUTES].sort()).toEqual([
            "armourPenetration",
            "attacks",
            "ballisticSkill",
            "damage",
            "detectionRange",
            "feelNoPain",
            "hit",
            "invulnSave",
            "save",
            "strength",
            "toughness",
            "weaponSkill",
            "wound",
        ]);
    });

    it("is a subset of the valid attribute vocabulary", () => {
        for (const attr of ENGINE_CONSUMED_ATTRIBUTES) {
            expect(MECHANIC_VOCABULARY.attributes.has(attr)).toBe(true);
        }
    });
});

describe("findInertAttributes", () => {
    it("names attributes the engine will silently ignore", () => {
        expect(findInertAttributes([mechanic("wounds"), mechanic("movement")])).toEqual(
            ["movement", "wounds"],
        );
    });

    it("says nothing about attributes a resolver reads", () => {
        expect(
            findInertAttributes([
                mechanic("hit"),
                mechanic("toughness"),
                mechanic("invulnSave"),
            ]),
        ).toEqual([]);
    });

    it("reports each inert attribute once, however many mechanics use it", () => {
        expect(
            findInertAttributes([mechanic("leadership"), mechanic("leadership")]),
        ).toEqual(["leadership"]);
    });

    it("ignores mechanics with no attribute, which are not characteristic-scoped", () => {
        const noAttr: Mechanic = {
            name: "Test",
            entity: "thisUnit",
            effect: "addsKeyword",
            keywords: ["SMOKE"],
            value: true,
        };
        expect(findInertAttributes([noAttr])).toEqual([]);
    });
});
