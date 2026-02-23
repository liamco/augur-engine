import React from "react";
import { NavLink, Route, Routes } from "react-router-dom";

import Logo from "./assets/Logo.tsx";

import SidebarNavigation from "#components/SidebarNavigation/SidebarNavigation.tsx";
import Scanlines from "#assets/Scanlines.tsx";
import Octagon from "#modules/Engagements/Octagon.tsx";

// import ListIndex from "#modules/Lists/ListIndex";
// import ViewList from "#modules/Lists/ViewList";
// import CreateList from "#modules/Lists/CreateList";
// import EngagementIndex from "#modules/Engagements/EngagementIndex";
// import CreateEngagement from "#modules/Engagements/CreateEngagement";
// import ViewEngagement from "#modules/Engagements/ViewEngagement";
// import { EngagementManagerProvider } from "#modules/Engagements/EngagementManagerContext.tsx";

const bgStyle = {
    opacity: "0.13",
    background:
        "radial-gradient(102.98% 52.72% at 1.84% 2.02%, #A4D065 0%, rgba(10, 26, 19, 0.00) 100%), radial-gradient(38.7% 24.73% at 3.1% 96.61%, #A4D065 0%, rgba(10, 26, 19, 0.00) 100%), radial-gradient(119.5% 64.31% at 98.62% 95.18%, #A4D065 0%, rgba(10, 26, 19, 0.00) 100%), radial-gradient(46.92% 30.92% at 97.19% 3.78%, #A4D065 0%, rgba(10, 26, 19, 0.00) 100%)",
};

export default function App() {
    return (
        <div className="h-screen grid pl-[60px] relative overflow-hidden p-6">
            <div
                style={bgStyle}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
            />
            <SidebarNavigation />
            <main className="border border-skarsnikGreen border-t-0 p-6 relative">
                <div className="flex gap-4 items-center absolute left-0 top-0 translate-y-[-50%] w-full">
                    <hr className="grow border-none h-px bg-skarsnikGreen" />
                    <Logo />
                    <hr className="grow border-none h-px bg-skarsnikGreen" />
                </div>
                {/*{/*<EngagementManagerProvider>*/}
                <Routes>
                    <Route path="/test-lab" element={<Octagon />} />
                    {/*<Route path="/engagements">
                            <Route index element={<EngagementIndex />} />
                            <Route path="new" element={<CreateEngagement />} />
                            <Route path="view/:engagementId" element={<ViewEngagement />} />
                        </Route>
                        <Route path="/lists">
                            <Route index element={<ListIndex />} />
                            <Route path="new" element={<CreateList />} />
                            <Route path="view/:listId" element={<ViewList />} />
                        </Route>*/}
                </Routes>
                {/*</EngagementManagerProvider>*/}
            </main>

            <Scanlines />
        </div>
    );
}
