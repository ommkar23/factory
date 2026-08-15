import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@factory/ui/globals.css";

export const metadata: Metadata = {
  title: "Factory Home",
  description: "Choose a Factory application.",
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
