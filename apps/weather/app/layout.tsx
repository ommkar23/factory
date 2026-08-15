import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@factory/ui/globals.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Weather",
  description: "A weather app is coming soon.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
