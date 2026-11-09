import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./advanced.css";
const dmSans = localFont({
  src: "../public/fonts/dm-sans.woff2",
  variable: "--font-dm-sans",
  display: "swap",
  weight: "100 1000",
});
const manrope = localFont({
  src: "../public/fonts/manrope.woff2",
  variable: "--font-manrope",
  display: "swap",
  weight: "200 800",
});
export const metadata: Metadata = {
  title: "Sitecraft — Construction, connected.",
  description:
    "A connected workspace for construction projects, site inventory, people, progress and cost control in Bangladesh.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}
