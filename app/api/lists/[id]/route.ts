import { getDb } from "@/app/db/client";
import { deleteList, getList, updateList } from "@/app/lists/listsRepository";
import { parseListInput } from "@/app/lists/parseListInput";

/** A single army list. See ../route.ts for why these handlers are this thin. */

interface Params {
    params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Params) {
    const { id } = await params;
    const list = await getList(getDb(), id);
    if (!list) return Response.json({ errors: ["not found"] }, { status: 404 });
    return Response.json({ list });
}

export async function PUT(request: Request, { params }: Params) {
    const { id } = await params;

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return Response.json({ errors: ["body must be valid JSON"] }, { status: 400 });
    }

    // A full replacement rather than a patch: the editor holds the whole list in
    // memory and saves it entire, so validating the complete shape is both simpler
    // and stricter than merging fields.
    const parsed = parseListInput(body);
    if (!parsed.ok) {
        return Response.json({ errors: parsed.errors }, { status: 400 });
    }

    const updated = await updateList(getDb(), id, parsed.value);
    if (!updated) return Response.json({ errors: ["not found"] }, { status: 404 });
    return Response.json({ list: updated });
}

export async function DELETE(_request: Request, { params }: Params) {
    const { id } = await params;
    const removed = await deleteList(getDb(), id);
    if (!removed) return Response.json({ errors: ["not found"] }, { status: 404 });
    return new Response(null, { status: 204 });
}
