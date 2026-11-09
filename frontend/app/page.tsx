import type { Metadata } from "next";
import { Marketing } from "../components/marketing";
export const metadata: Metadata = {
  metadataBase: new URL(process.env.URL || "http://localhost:3000"),
  title: "Sitecraft — Construction, connected.",
  description:
    "Connect your construction projects, materials, people, progress and costs in one workspace. Purpose-built for construction teams in Bangladesh.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Sitecraft — Construction, connected.",
    description:
      "Your people. Your materials. Your progress. One connected construction workspace.",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/marketing-og.png",
        width: 1200,
        height: 630,
        alt: "Sitecraft — Build with a clearer picture",
      },
    ],
  },
};
export default function Page() {
  return <Marketing />;
}
