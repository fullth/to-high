import { AuthProvider } from "@/contexts/auth-context";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://to-high.vercel.app";
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "GTM-W3SZTNTK";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "위로 | AI 심리 상담",
    template: "%s | 위로",
  },
  description:
    "오롯이 나만을 위한 AI 심리 상담 서비스",
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
      "말할 힘도 없을 때는, 그저 클릭만 하시면 되도록 도와드릴게요",
  },
  twitter: {
    card: "summary_large_image",
    title: "위로 | AI 심리 상담",
    description:
      "말할 힘도 없을 때는, 그저 클릭만 하시면 되도록 도와드릴게요",
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
      "말할 힘도 없을 때는, 그저 클릭만 하시면 되도록 도와드릴게요. 일상부터 천천히 들어드리는 AI 심리 상담 서비스",
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
        <meta name="theme-color" content="#faf8f3" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
        </Script>
      </head>
      <body className={`${geistSans.variable} font-sans antialiased`}>
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
