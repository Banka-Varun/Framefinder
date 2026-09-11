import type { Metadata } from "next";
import "./globals.css";
import {ThemeProvider} from "./theme-toggle";
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
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{__html: "try{var t=localStorage.getItem('ff-theme');document.documentElement.dataset.theme=t==='light'||t==='dark'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch(e){}"}}/></head>
      <body className="antialiased"><ThemeProvider><SessionProvider>{children}</SessionProvider></ThemeProvider></body>
    </html>
  );
}
