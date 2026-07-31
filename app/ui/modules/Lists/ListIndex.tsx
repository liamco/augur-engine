import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import type { ArmyList } from "#types/List";
import { findFaction } from "@/app/lists/factionCatalogue";
import { fetchLists, removeList } from "./listsApi";

/**
 * Saved army lists.
 *
 * Placeholder presentation — the shape of the data and the API contract are the
 * point here, not the visuals. Styling follows Octagon's conventions so it does
 * not look foreign next to the test lab.
 */
const ListIndex = () => {
    const [lists, setLists] = useState<ArmyList[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = () => {
        fetchLists()
            .then(setLists)
            .catch((e: Error) => setError(e.message));
    };

    useEffect(load, []);

    const onDelete = async (id: string) => {
        try {
            await removeList(id);
            load();
        } catch (e) {
            setError((e as Error).message);
        }
    };

    return (
        <div className="space-y-6 overflow-auto FullScreenHeight">
            <header className="flex justify-between items-center">
                <h1 className="text-blockcaps-l">Army lists</h1>
                <Link
                    to="/lists/new"
                    className="border border-skarsnikGreen text-skarsnikGreen px-3 py-1.5 text-blockcaps-xs hover:bg-deathWorldForest/40"
                >
                    New list
                </Link>
            </header>

            {error && (
                <div className="border border-red-500/60 text-red-400 p-3 text-blockcaps-xs">
                    {error}
                </div>
            )}

            {lists === null && !error && (
                <p className="text-blockcaps-xs text-skarsnikGreen/60">Loading…</p>
            )}

            {lists?.length === 0 && (
                <p className="text-blockcaps-xs text-skarsnikGreen/60">
                    No lists yet.
                </p>
            )}

            <div className="divide-y divide-deathWorldForest/50">
                {lists?.map((list) => (
                    <div
                        key={list.id}
                        className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 py-2"
                    >
                        <Link
                            to={`/lists/${list.id}`}
                            className="text-blockcaps-m text-skarsnikGreen hover:underline"
                        >
                            {list.name}
                        </Link>
                        <span className="text-blockcaps-xs text-skarsnikGreen/60">
                            {findFaction(list.factionSlug)?.name ?? list.factionSlug}
                        </span>
                        <span className="text-blockcaps-xs text-skarsnikGreen/60">
                            {list.listSize}
                        </span>
                        <button
                            type="button"
                            onClick={() => onDelete(list.id)}
                            className="text-blockcaps-xs text-red-400/70 hover:text-red-400"
                        >
                            Delete
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ListIndex;
