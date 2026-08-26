import React from "react";
import "@factory/ui/globals.css";

export const metadata = {
  title: "Weather",
  description: "A weather app is coming soon.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
