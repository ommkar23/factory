import React from "react";
import "@factory/ui/globals.css";
export const metadata = {
  title: "Factory Home",
  description: "Choose a Factory application.",
};
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
