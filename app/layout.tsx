import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "EMID Proofline — Integrity Before Intelligence",
  description: "An agent-native evidence workspace where every claim stays traceable, every gap stays visible, and every change waits for human approval.",
  openGraph: {
    title: "EMID Proofline — Integrity Before Intelligence",
    description: "Trace claims. Expose gaps. Keep humans in control.",
    type: "website",
    locale: "es_AR",
    images: [{ url: "/og-proofline.png", width: 1731, height: 909, alt: "EMID Proofline — Integrity Before Intelligence" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "EMID Proofline — Integrity Before Intelligence",
    description: "Trace claims. Expose gaps. Keep humans in control.",
    images: ["/og-proofline.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
