import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ListEditor from "../ListEditor";
import ListIndex from "../ListIndex";

/**
 * Static render only — there is no DOM environment in this suite, so this checks
 * the views mount and show the right options rather than exercising interaction.
 * The validation they display is tested directly in app/lists/__tests__.
 */
const render = (path: string, element: React.ReactElement) =>
    renderToStaticMarkup(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path="/lists" element={<ListIndex />} />
                <Route path="/lists/new" element={element} />
            </Routes>
        </MemoryRouter>,
    );

describe("ListEditor", () => {
    const html = render("/lists/new", <ListEditor />);

    it("renders the creation form", () => {
        expect(html).toContain("New list");
        expect(html).toContain("Battle size");
        expect(html).toContain("Faction");
    });

    it("offers every faction in the codex", () => {
        for (const name of ["Necrons", "Space Marines", "Tyranids"]) {
            expect(html).toContain(name);
        }
    });

    it("shows each battle size with both of its budgets", () => {
        // A player choosing a size needs to see the detachment budget, not just
        // the points limit — it is what constrains the next step.
        expect(html).toContain("1000pts, 2 detachment pts");
        expect(html).toContain("2000pts, 3 detachment pts");
        expect(html).toContain("3000pts, 3 detachment pts");
    });

    it("hides the detachment section until faction and size are chosen", () => {
        // Affordability is meaningless without both.
        expect(html).not.toContain("Detachments");
    });

    it("says what is still to come, rather than looking finished", () => {
        expect(html).toContain("Units, enhancements and wargear come next");
    });
});

describe("ListIndex", () => {
    it("renders without a server and offers the create action", () => {
        const html = render("/lists", <ListEditor />);
        expect(html).toContain("Army lists");
        expect(html).toContain("New list");
    });
});
