import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClueDrop Daily — Five Clues. One Mystery.",
  description: "Solve a fresh general-knowledge mystery every day using five progressively easier clues.",
  keywords: ["daily trivia game", "general knowledge game", "online quiz", "daily puzzle", "ClueDrop"],
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
