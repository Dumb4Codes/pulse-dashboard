import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Inter, Noto_Sans_Devanagari } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Hindi glyphs: Fraunces and Inter have none, so Devanagari text would fall back to a thin system
// font. `preload: false` + the devanagari-only subset means the browser downloads this file solely
// when a page actually renders Devanagari (unicode-range), so English users pay nothing.
const devanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Pulse — your personalized feed",
  description:
    "Pulse: news, movies and social in one searchable, re-orderable, themeable feed.",
};

// Runs before first paint so the persisted theme is applied with no light/dark flash.
const NO_FLASH_THEME_SCRIPT = `try{var s=JSON.parse(localStorage.getItem('pulse:v1')||'{}');var t=(s.preferences&&s.preferences.theme)||'system';
var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);
document.documentElement.dataset.theme=d?'dark':'light';}catch(e){document.documentElement.dataset.theme='light'}`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fraunces.variable} ${inter.variable} ${devanagari.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
