import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SITE } from "@/data/story";
import "@fontsource-variable/outfit/wght.css";
import "@fontsource-variable/manrope/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  title: `${SITE.name} | ${SITE.role}`,
  description: SITE.description,
  authors: [{ name: SITE.name }],
};

export const viewport: Viewport = {
  themeColor: "#0d0f14",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
