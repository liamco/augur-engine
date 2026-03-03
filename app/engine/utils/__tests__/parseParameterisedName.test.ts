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
