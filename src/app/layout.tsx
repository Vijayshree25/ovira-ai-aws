import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ovira AI - Women's Health & Period Tracker",
  description: "AI-powered women's health companion for period tracking, symptom logging, and preventive care insights. Compassionate, private, and empowering.",
  keywords: ["women's health", "period tracker", "menstrual health", "AI health assistant", "symptom tracker"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Ovira AI",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#7C3AED",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${dmSans.className} antialiased`} suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Script id="sw-register" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js', { scope: '/' })
                  .then((reg) => console.log('[SW] Registered:', reg.scope))
                  .catch((err) => console.log('[SW] Registration failed:', err));
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
