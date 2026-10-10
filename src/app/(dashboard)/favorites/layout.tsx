import type { Metadata } from "next";
import type { ReactNode } from "react";

// The page itself is a client component (it cannot export metadata), so this passthrough layout
// gives the route its own <title> (WCAG 2.4.2: a title that says what the page is).
export const metadata: Metadata = { title: "Favorites — Pulse" };

export default function FavoritesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
