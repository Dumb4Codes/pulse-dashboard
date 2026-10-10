import type { Metadata } from "next";
import type { ReactNode } from "react";

// The page itself is a client component (it cannot export metadata), so this passthrough layout
// gives the route a <title>; the page replaces it with the item's headline once it is known.
export const metadata: Metadata = { title: "Details — Pulse" };

export default function ContentLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
