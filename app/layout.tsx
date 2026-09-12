import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://emid-proofline.artash-nazaryan.chatgpt.site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "EMID Proofline — Integrity Before Intelligence",
  description: "An agent-native evidence workspace where every claim stays traceable, every gap stays visible, and every change waits for human approval.",
  openGraph: {
    title: "EMID Proofline — Integrity Before Intelligence",
    description: "Trace claims. Expose gaps. Keep humans in control.",
    type: "website",
    locale: "en_US",
    images: [{ url: "/og-proofline-v2.png", width: 1731, height: 909, alt: "EMID Proofline — Integrity Before Intelligence. Proposal approved, not executed." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "EMID Proofline — Integrity Before Intelligence",
    description: "Trace claims. Expose gaps. Keep humans in control.",
    images: ["/og-proofline-v2.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
