import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@factory/ui/globals.css";

export const metadata: Metadata = {
  title: "Live Splash",
  description: "A local-first Live Splash development baseline",
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
