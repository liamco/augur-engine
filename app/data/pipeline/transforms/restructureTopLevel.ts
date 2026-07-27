import type { RawDatasheet } from "../types";

export interface TopLevelFields {
    faction: { id: string; slug: string };
    source: { id: string; name: string };
    supplement: {
        key: string;
        slug: string;
        name: string;
        label: string;
        isSupplement: boolean;
    };
    leader: {
        canLead: { id: string; slug: string }[];
        leaderNotes: string;
    } | null;
}

export function restructureTopLevel(raw: RawDatasheet): TopLevelFields {
    const faction = {
        id: raw.factionId,
        slug: raw.factionSlug,
    };

    const source = {
        id: raw.sourceId,
        name: raw.sourceName,
    };

    const supplement = {
        key: raw.supplementKey,
        slug: "",
        name: "",
        label: raw.supplementLabel,
        isSupplement: raw.isSupplement,
    };

    const leader =
        raw.leaders && raw.leaders.length > 0
            ? {
                  canLead: raw.leaders.map((l) => ({ id: l.id, slug: l.slug })),
                  leaderNotes: [raw.leaderHead, raw.leaderFooter]
                      .filter(Boolean)
                      .join("\n"),
              }
            : null;

    return { faction, source, supplement, leader };
}
