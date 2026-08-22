import React from "react";
import "@factory/ui/globals.css";
export const metadata = {
  title: "Live Splash",
  description: "A local-first Live Splash development baseline",
};
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
