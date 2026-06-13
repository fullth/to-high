import { AuthProvider } from "@/contexts/auth-context";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://to-high.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "위로 | AI 심리 상담",
    template: "%s | 위로",
  },
  description:
    "말로 풀기 어려운 날엔 선택지부터 따라오세요. 일상부터 천천히 들어드리는 AI 심리 상담 서비스",
  keywords: ["AI 상담", "심리 상담", "마음 치유", "고민 상담", "위로", "to-high"],
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: "위로",
    title: "위로 | AI 심리 상담",
    description:
      "말로 풀기 어려운 날엔 선택지부터 따라오세요. 일상부터 천천히 들어드릴게요",
  },
  twitter: {
    card: "summary_large_image",
    title: "위로 | AI 심리 상담",
    description:
      "말로 풀기 어려운 날엔 선택지부터 따라오세요. 일상부터 천천히 들어드릴게요",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  verification: {
    google: "WZ0pXB_4754GpwBQnK4W0OuXhOZx8CMxlRbMFsLkcOU",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "위로",
    url: SITE_URL,
    description:
      "말로 풀기 어려운 날엔 선택지부터 따라오세요. 일상부터 천천히 들어드리는 AI 심리 상담 서비스",
    applicationCategory: "HealthApplication",
    operatingSystem: "Web",
    inLanguage: "ko",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "KRW",
    },
  };

  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
        <meta name="theme-color" content="#0f1f15" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${geistSans.variable} font-sans antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
