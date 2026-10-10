import type { ReactNode } from "react";
import { Header, SkipLink } from "@/components/Header";
import { MobileTabBar } from "@/components/MobileTabBar";
import { PageTransition } from "@/components/PageTransition";
import { ShellMotion } from "@/components/ShellMotion";
import { Sidebar } from "@/components/Sidebar";

/**
 * Authenticated app shell (the auth gate itself is `src/proxy.ts`).
 *
 *  >= 1024px   264px glass sidebar | header + content
 *  768-1023px  72px icon rail      | header + content
 *  < 768px     header + content, floating glass tab bar pinned to the bottom
 *
 * Server component: it only composes client islands, and `children` (the pages) stay server-rendered
 * where they can. DOM order matters for keyboard users: skip link, then sidebar, then header, then
 * `<main>`. Two soft, static light pools sit behind everything so the glass surfaces have something
 * to blur; they are decorative, not animated, and hidden in forced-colors mode.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ShellMotion>
      <SkipLink />
      <div className="relative isolate min-h-dvh md:grid md:grid-cols-[72px_minmax(0,1fr)] lg:grid-cols-[264px_minmax(0,1fr)]">
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden forced-colors:hidden">
          <div className="absolute -left-32 -top-32 size-[22rem] rounded-full bg-[radial-gradient(closest-side,var(--accent),transparent)] opacity-20 md:-left-40 md:-top-40 md:size-[34rem] dark:opacity-15" />
          <div className="absolute -bottom-40 -right-32 size-[26rem] rounded-full bg-[radial-gradient(closest-side,var(--accent-2),transparent)] opacity-20 md:-bottom-52 md:-right-40 md:size-[40rem] dark:opacity-25" />
        </div>

        <Sidebar />

        <div className="flex min-w-0 flex-col">
          <Header />
          {/* Programmatic focus target for the skip link; it is not interactive, so no focus ring. */}
          <main
            id="main"
            tabIndex={-1}
            className="flex-1 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-6 outline-none sm:px-6 md:pb-12 lg:px-10 lg:pt-8"
          >
            <div className="mx-auto w-full max-w-[84rem]">
              <PageTransition>{children}</PageTransition>
            </div>
          </main>
        </div>
      </div>
      <MobileTabBar />
    </ShellMotion>
  );
}
