import { AuthProvider } from "@/context/AuthContext";
import type { Metadata } from "next";
import { Inter } from "next/font/google"; 
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL('https://www.classcrave.com'),
  title: {
    default: "ClassCrave | Gamified Classroom Learning Adventure",
    template: "%s | ClassCrave"
  },
  description: "Transform your classroom into an epic space adventure. Track behavior, award XP, and engage students with ClassCrave's immersive gamification platform for educators.",
  keywords: ["gamified classroom", "classroom management", "student engagement", "educational games", "XP system for schools", "behavior tracking", "ClassCrave", "space adventure", "PBIS tools"],
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
    title: "ClassCrave | The Ultimate Gamified Classroom Adventure",
    description: "Engage students with immersive missions, real-time behavior tracking, and collaborative space exploration.",
    url: 'https://www.classcrave.com',
    siteName: 'ClassCrave',
    images: [
      {
        url: '/images/logos/classcrave logo.png', // Ideally this should be a large 1200x630 og-image
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
    description: "Turn your class into a spaceship crew. Boost engagement with XP, ranks, and missions.",
    images: ['/images/logos/classcrave logo.png'], // Fallback to logo
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
      <body className={inter.className}>
        <AuthProvider>
            {children}
        </AuthProvider>
      </body>
    </html>
  );
}
