import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
import ConditionalAuthProvider from '@/components/providers/ConditionalAuthProvider';
import { VersionProvider } from '@/contexts/VersionContext';
import { Toaster } from 'sonner';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FayClick - La Super App du Sénégal",
  description: "Gérez votre business en toute simplicité avec FayClick. La super application pour prestataires, commerces, écoles et immobilier au Sénégal.",
  keywords: "FayClick, Sénégal, business, facturation, gestion, PWA, mobile money",
  authors: [{ name: "FayClick Team" }],
  creator: "FayClick",
  publisher: "FayClick",
  openGraph: {
    title: "FayClick - La Super App du Sénégal",
    description: "Gérez votre business en toute simplicité",
    url: "https://fayclick.net",
    siteName: "FayClick",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FayClick - La Super App du Sénégal",
    description: "Gérez votre business en toute simplicité",
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5.0,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#0ea5e9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${inter.variable} ${montserrat.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-inter antialiased min-h-screen">
        <ConditionalAuthProvider>
          <VersionProvider autoCheck={true}>
            <div className="safe-area-container">
              {children}
            </div>
            <Toaster
              position="top-center"
              richColors
              closeButton
              toastOptions={{
                className: 'glassmorphism-toast',
                duration: 4000,
              }}
            />
          </VersionProvider>
        </ConditionalAuthProvider>
      </body>
    </html>
  );
}
