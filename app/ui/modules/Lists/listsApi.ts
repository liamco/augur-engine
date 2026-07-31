import type { ArmyList, ListSelections } from "#types/List";

/**
 * Client for `/api/lists`.
 *
 * Deliberately plain `fetch` with no caching layer — the editor loads a list,
 * edits it and saves it, so there is nothing to invalidate yet. Worth revisiting
 * when engagements start streaming changes over realtime.
 */

export interface ListPayload {
    name: string;
    factionSlug: string;
    listSize: string;
    dataVersion: string;
    selections: ListSelections;
}

export class ListsApiError extends Error {
    constructor(
        message: string,
        /** Field-level messages from the server's validator, if it sent any. */
        readonly errors: string[] = [],
    ) {
        super(message);
        this.name = "ListsApiError";
    }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, {
        ...init,
        headers: init?.body ? { "content-type": "application/json" } : undefined,
    });

    if (response.status === 204) return undefined as T;

    let body: unknown = null;
    try {
        body = await response.json();
    } catch {
        // A non-JSON body means something upstream answered instead of the route.
    }

    if (!response.ok) {
        const errors =
            body && typeof body === "object" && Array.isArray((body as { errors?: unknown }).errors)
                ? ((body as { errors: string[] }).errors)
                : [];
        throw new ListsApiError(
            errors[0] ?? `Request failed (${response.status})`,
            errors,
        );
    }

    return body as T;
}

export const fetchLists = () =>
    request<{ lists: ArmyList[] }>("/api/lists").then((r) => r.lists);

export const fetchList = (id: string) =>
    request<{ list: ArmyList }>(`/api/lists/${id}`).then((r) => r.list);

export const createList = (payload: ListPayload) =>
    request<{ list: ArmyList }>("/api/lists", {
        method: "POST",
        body: JSON.stringify(payload),
    }).then((r) => r.list);

export const saveList = (id: string, payload: ListPayload) =>
    request<{ list: ArmyList }>(`/api/lists/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    }).then((r) => r.list);

export const removeList = (id: string) =>
    request<void>(`/api/lists/${id}`, { method: "DELETE" });
