import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SlyOS — Decentralized AI Computing on Idle Smartphones | 70% Lower Cost",
  description: "Transform idle smartphones into a verified AI compute grid. SlyOS delivers proof-verified outputs, edge-first latency, and up to 70% lower costs than traditional cloud providers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
