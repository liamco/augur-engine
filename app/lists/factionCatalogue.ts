import necrons from "#codex/factions/necrons/faction.json";
import spaceMarines from "#codex/factions/space-marines/faction.json";
import tyranids from "#codex/factions/tyranids/faction.json";

/**
 * The factions a list can be built for.
 *
 * Read from the generated `faction.json` files rather than hand-listed, so a new
 * faction appearing in the codex needs one import here and nothing else.
 *
 * `dataVersion` is the reason this reads the faction files at all: a list records
 * which codex snapshot its selections were made against, so a later parse that
 * removes a datasheet can be detected rather than silently breaking the list.
 */
export interface FactionChoice {
    id: string;
    slug: string;
    name: string;
    dataVersion: string;
}

const pick = (faction: {
    id: string;
    slug: string;
    name: string;
    dataVersion: string;
}): FactionChoice => ({
    id: faction.id,
    slug: faction.slug,
    name: faction.name,
    dataVersion: faction.dataVersion,
});

export const factionCatalogue: FactionChoice[] = [
    pick(necrons),
    pick(spaceMarines),
    pick(tyranids),
].sort((a, b) => a.name.localeCompare(b.name));

export const findFaction = (slug: string): FactionChoice | null =>
    factionCatalogue.find((faction) => faction.slug === slug) ?? null;
