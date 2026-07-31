import { getDb } from "@/app/db/client";
import { createList, listLists } from "@/app/lists/listsRepository";
import { parseListInput } from "@/app/lists/parseListInput";

/**
 * Collection endpoint for army lists.
 *
 * Thin on purpose: parse, delegate, respond. Validation lives in
 * `parseListInput` and persistence in `listsRepository`, both of which are tested
 * without a server — so there is nothing here worth testing that is not already
 * covered somewhere faster.
 */

export async function GET() {
    // No owner filter until auth lands; every list is visible.
    const rows = await listLists(getDb());
    return Response.json({ lists: rows });
}

export async function POST(request: Request) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return Response.json({ errors: ["body must be valid JSON"] }, { status: 400 });
    }

    const parsed = parseListInput(body);
    if (!parsed.ok) {
        return Response.json({ errors: parsed.errors }, { status: 400 });
    }

    const created = await createList(getDb(), parsed.value);
    return Response.json({ list: created }, { status: 201 });
}
