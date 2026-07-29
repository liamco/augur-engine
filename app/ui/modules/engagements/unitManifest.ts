import heavyIntercessors from "#codex/heavy-intercessor-squad.json";
import infernusSquad from "#codex/infernus-squad.json";
import librarianInTerminatorArmour from "#codex/librarian-in-terminator-armour.json";
import wingedTyranidPrime from "#codex/winged-tyranid-prime.json";
import termagants from "#codex/termagants.json";
import gargoyles from "#codex/gargoyles.json";
import psychophage from "#codex/psychophage.json";
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
        label: "Winged Tyranid Prime",
        data: wingedTyranidPrime as unknown as TestUnit,
    },
    { label: "Termagants", data: termagants as unknown as TestUnit },
    { label: "Gargoyles", data: gargoyles as unknown as TestUnit },
    { label: "Psychophage", data: psychophage as unknown as TestUnit },
];
