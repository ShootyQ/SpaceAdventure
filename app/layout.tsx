import { AuthProvider } from "@/context/AuthContext";
import type { Metadata } from "next";
import { IBM_Plex_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.classcrave.com'),
  title: {
    default: "ClassCrave | Gamified Classroom Learning Adventure",
    template: "%s | ClassCrave"
  },
  description: "A professional classroom gamification platform with clear routines, rewards, and multiple game experiences for educators.",
  keywords: ["gamified classroom", "classroom management", "student engagement", "educational games", "XP system for schools", "behavior tracking", "ClassCrave", "PBIS tools", "classroom games"],
  authors: [{ name: "ShootyQ" }],
  creator: "ClassCrave Team",
  publisher: "ClassCrave",
  alternates: {
    canonical: 'https://www.classcrave.com',
  },
  icons: {
    icon: '/images/logos/classcravefavicon.png',
    shortcut: '/images/logos/classcravefavicon.png',
    apple: '/images/logos/classcravefavicon.png',
  },
  openGraph: {
    title: "ClassCrave | Classroom Games That Make Progress Visible",
    description: "Engage students with clear routines, real-time behavior tracking, and game-based motivation.",
    url: 'https://www.classcrave.com',
    siteName: 'ClassCrave',
    images: [
      {
        url: '/images/logos/croppedclasscravelogo.png', // Ideally this should be a large 1200x630 og-image
        width: 1200,
        height: 630,
        alt: 'ClassCrave Classroom Adventure',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "ClassCrave | Gamified Classroom Learning",
    description: "Boost engagement with XP, ranks, and missions built for educators.",
    images: ['/images/logos/croppedclasscravelogo.png'], // Fallback to logo
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${plexSans.variable} ${fraunces.variable} font-body`}>
        <AuthProvider>
            {children}
        </AuthProvider>
      </body>
    </html>
  );
}
