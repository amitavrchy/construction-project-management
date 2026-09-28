import type { Metadata } from "next";
import { Provider } from "../components/provider";
import "./globals.css";
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
    <html lang="en">
      <body>
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
