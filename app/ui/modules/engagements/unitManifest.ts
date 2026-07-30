import heavyIntercessors from "#codex/factions/space-marines/datasheets/000001177.json";
import infernusSquad from "#codex/factions/space-marines/datasheets/000000126.json";
import librarianInTerminatorArmour from "#codex/factions/space-marines/datasheets/000000079.json";
import redemptorDreadnought from "#codex/factions/space-marines/datasheets/000002717.json";
import wingedTyranidPrime from "#codex/factions/tyranids/datasheets/000002694.json";
import termagants from "#codex/factions/tyranids/datasheets/000000468.json";
import gargoyles from "#codex/factions/tyranids/datasheets/000000484.json";
import psychophage from "#codex/factions/tyranids/datasheets/000002689.json";
import { TestUnit } from "#types/Test";

export interface UnitManifestEntry {
    label: string;
    data: TestUnit;
}

export const unitManifest: UnitManifestEntry[] = [
    {
        label: "Heavy Intercessor Squad",
        data: heavyIntercessors as unknown as TestUnit,
    },
    {
        label: "Infernus Squad",
        data: infernusSquad as unknown as TestUnit,
    },
    {
        label: "Librarian in Terminator armour",
        data: librarianInTerminatorArmour as unknown as TestUnit,
    },
    {
        label: "Redemptor Dreadnought",
        data: redemptorDreadnought as unknown as TestUnit,
    },
    {
        label: "Winged Tyranid Prime",
        data: wingedTyranidPrime as unknown as TestUnit,
    },
    { label: "Termagants", data: termagants as unknown as TestUnit },
    { label: "Gargoyles", data: gargoyles as unknown as TestUnit },
    { label: "Psychophage", data: psychophage as unknown as TestUnit },
];
