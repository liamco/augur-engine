import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import type { ListSelections } from "#types/List";
import { detachmentCatalogue } from "@/app/lists/detachmentCatalogue";
import { factionCatalogue, findFaction } from "@/app/lists/factionCatalogue";
import { listSizes } from "@/app/lists/listSizes";
import {
    validateDetachments,
    type DetachmentProblem,
} from "@/app/lists/validateDetachments";
import { createList, fetchList, saveList } from "./listsApi";

/**
 * Build or edit an army list: faction, battle size, detachments.
 *
 * Placeholder presentation. What matters is that it drives the real validator —
 * budget arithmetic, affordability and every refusal come from
 * `validateDetachments`, so the rules live in one tested place and this only
 * renders the result. Units and wargear are phase 2.
 */

/** Turn a structured problem into something a player can act on. */
const describe = (problem: DetachmentProblem): string => {
    switch (problem.kind) {
        case "noDetachment":
            return "Pick at least one detachment.";
        case "unknownListSize":
            return `"${problem.listSize}" is not a known battle size.`;
        case "unknownDetachment":
            return `"${problem.slug}" is not a detachment we have.`;
        case "unpricedDetachment":
            return `${problem.name} has no detachment cost in the codex yet, so it cannot be budget-checked.`;
        case "wrongFaction":
            return `"${problem.slug}" belongs to ${problem.actual}, not ${problem.expected}.`;
        case "duplicate":
            return `"${problem.slug}" is selected twice.`;
        case "overBudget":
            return `Detachments cost ${problem.spent} points, ${problem.spent - problem.budget} over the ${problem.budget} available.`;
    }
};

const ListEditor = () => {
    const { listId } = useParams<{ listId: string }>();
    const navigate = useNavigate();
    const isNew = !listId;

    const [name, setName] = useState("");
    const [factionSlug, setFactionSlug] = useState("");
    const [listSize, setListSize] = useState("");
    const [detachments, setDetachments] = useState<string[]>([]);
    const [units, setUnits] = useState<ListSelections["units"]>([]);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!listId) return;
        fetchList(listId)
            .then((list) => {
                setName(list.name);
                setFactionSlug(list.factionSlug);
                setListSize(list.listSize);
                setDetachments(list.selections.detachments);
                setUnits(list.selections.units);
            })
            .catch((e: Error) => setError(e.message));
    }, [listId]);

    const validation = useMemo(
        () =>
            validateDetachments({
                slugs: detachments,
                listSize,
                factionSlug,
                catalogue: detachmentCatalogue,
            }),
        [detachments, listSize, factionSlug],
    );

    // Changing faction or size invalidates the detachment picks, so clear them
    // rather than leaving a selection that silently fails validation.
    const onFactionChange = (slug: string) => {
        setFactionSlug(slug);
        setDetachments([]);
    };
    const onListSizeChange = (size: string) => {
        setListSize(size);
        setDetachments([]);
    };

    const affordable = useMemo(
        () =>
            detachmentCatalogue
                .filter((d) => validation.affordable.includes(d.slug))
                .sort((a, b) => a.name.localeCompare(b.name)),
        [validation.affordable],
    );

    const selected = detachments
        .map((slug) => detachmentCatalogue.find((d) => d.slug === slug))
        .filter((d): d is (typeof detachmentCatalogue)[number] => Boolean(d));

    const canSave =
        name.trim().length > 0 && factionSlug !== "" && listSize !== "" && !saving;

    const onSave = async () => {
        setSaving(true);
        setError(null);
        try {
            const payload = {
                name: name.trim(),
                factionSlug,
                listSize,
                // Recorded so a later parse that removes a datasheet is detectable.
                dataVersion: findFaction(factionSlug)?.dataVersion ?? "unknown",
                selections: { detachments, units },
            };
            const list = isNew
                ? await createList(payload)
                : await saveList(listId, payload);
            navigate(`/lists/${list.id}`);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 overflow-auto FullScreenHeight">
            <header className="flex justify-between items-center">
                <h1 className="text-blockcaps-l">
                    {isNew ? "New list" : "Edit list"}
                </h1>
                <div className="flex gap-3 items-center">
                    {!validation.valid && (
                        <span className="text-blockcaps-xs text-yellow-500/70">
                            {validation.problems.length} issue
                            {validation.problems.length === 1 ? "" : "s"}
                        </span>
                    )}
                    <button
                        type="button"
                        disabled={!canSave}
                        onClick={onSave}
                        className="border border-skarsnikGreen text-skarsnikGreen px-3 py-1.5 text-blockcaps-xs hover:bg-deathWorldForest/40 disabled:opacity-40"
                    >
                        {saving ? "Saving…" : "Save"}
                    </button>
                </div>
            </header>

            {error && (
                <div className="border border-red-500/60 text-red-400 p-3 text-blockcaps-xs">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-3 gap-6">
                <Field label="Name">
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Untitled list"
                        className="w-full bg-nocturneGreen border border-deathWorldForest text-skarsnikGreen py-1.5 px-2 text-blockcaps-xs"
                    />
                </Field>

                <Field label="Faction">
                    <Select
                        value={factionSlug}
                        onChange={onFactionChange}
                        options={factionCatalogue.map((f) => ({
                            value: f.slug,
                            label: f.name,
                        }))}
                    />
                </Field>

                <Field label="Battle size">
                    <Select
                        value={listSize}
                        onChange={onListSizeChange}
                        options={listSizes.map((s) => ({
                            value: s.name,
                            label: `${s.name} — ${s.pointLimit}pts, ${s.detachmentPointBudget} detachment pts`,
                        }))}
                    />
                </Field>
            </div>

            {factionSlug && listSize && (
                <section className="space-y-3">
                    <div className="flex justify-between items-baseline">
                        <h2 className="text-blockcaps-m text-skarsnikGreen/60">
                            Detachments
                        </h2>
                        <span className="text-blockcaps-xs text-skarsnikGreen/60">
                            {validation.spent} / {validation.budget} points
                        </span>
                    </div>

                    {selected.length > 0 && (
                        <div className="divide-y divide-deathWorldForest/50 border border-deathWorldForest">
                            {selected.map((d) => (
                                <div
                                    key={d.slug}
                                    className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-2"
                                >
                                    <span className="text-blockcaps-xs">{d.name}</span>
                                    <span className="text-blockcaps-xs text-skarsnikGreen/60">
                                        {d.detachmentPoints ?? "—"} pts
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setDetachments((prev) =>
                                                prev.filter((s) => s !== d.slug),
                                            )
                                        }
                                        className="text-blockcaps-xs text-red-400/70 hover:text-red-400"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {validation.problems.length > 0 && (
                        <ul className="border border-yellow-600/50 text-yellow-500/80 p-3 text-blockcaps-xs space-y-1">
                            {validation.problems.map((problem, i) => (
                                <li key={i}>{describe(problem)}</li>
                            ))}
                        </ul>
                    )}

                    <Field
                        label={`Add a detachment (${affordable.length} affordable)`}
                    >
                        <Select
                            value=""
                            onChange={(slug) =>
                                setDetachments((prev) => [...prev, slug])
                            }
                            options={affordable.map((d) => ({
                                value: d.slug,
                                label: `${d.name} — ${d.detachmentPoints} pts`,
                            }))}
                            placeholder={
                                affordable.length === 0
                                    ? "Nothing affordable within the remaining budget"
                                    : "-- Select --"
                            }
                        />
                    </Field>
                </section>
            )}

            <p className="text-blockcaps-xs text-skarsnikGreen/40">
                Units, enhancements and wargear come next.
            </p>
        </div>
    );
};

/* ── placeholder form primitives ───────────────────────────────────── */

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-blockcaps-xs text-skarsnikGreen/60">
                {label}
            </label>
            {children}
        </div>
    );
}

function Select({
    value,
    onChange,
    options,
    placeholder = "-- Select --",
}: {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
}) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="bg-nocturneGreen border border-deathWorldForest text-skarsnikGreen py-1.5 px-2 text-blockcaps-xs"
        >
            <option value="">{placeholder}</option>
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    );
}

export default ListEditor;
