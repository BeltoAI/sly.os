import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SlyOS | Mission Control",
  description: "SlyOS edge AI infrastructure dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <div className="noise"></div>
        {children}
      </body>
    </html>
  );
}
