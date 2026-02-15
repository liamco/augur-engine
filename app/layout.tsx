import type { Metadata } from "next";
import "./ui/styles/index.css";

export const metadata: Metadata = {
    title: "Warhammer 40000 Game Assistant",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
