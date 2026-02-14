import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Strategos Logis Augur Engine",
  description: "Warhammer 40K strategy and simulation engine",
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
