import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SITE } from "@/data/story";
import "./globals.css";

export const metadata: Metadata = {
  title: `${SITE.name} | ${SITE.role}`,
  description: SITE.description,
  authors: [{ name: SITE.name }],
};

export const viewport: Viewport = {
  themeColor: "#0b1020",
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
