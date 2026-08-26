import React from "react";
import "@factory/ui/globals.css";
export const metadata = {
  title: "Live Splash",
  description: "Factory Live Splash authenticated shell",
};
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
