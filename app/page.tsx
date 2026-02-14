import Octagon from "./ui/modules/engagements/Octagon";

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-gray-950 text-white">
            <h1 className="text-4xl font-bold tracking-tight">
                Strategos Logis Augur Engine
            </h1>
            <Octagon />
        </main>
    );
}
