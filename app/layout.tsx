import type { Metadata } from "next";
import "./globals.css";
import {SessionProvider} from "./session-provider";

export const metadata: Metadata = {
  title: "Framefinder — Find your next film",
  description: "Discover films for your mood, build your taste profile and choose one movie for tonight.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/framefinder-mark-v4.svg",
    shortcut: "/framefinder-mark-v4.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased"><SessionProvider>{children}</SessionProvider></body>
    </html>
  );
}
