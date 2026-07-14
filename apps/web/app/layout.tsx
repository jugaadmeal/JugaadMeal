import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Inter, Outfit } from 'next/font/google';
import Providers from './providers';
import Navbar from '../components/shared/Navbar';
import BottomNav from '../components/shared/BottomNav';
import '../styles/globals.css';

// Self-host Google fonts to eliminate external server roundtrips and rendering delays
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  });

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CampusEat | Student-Led Menu Polling & Micro-Location Delivery',
  description: 'Vote on tomorrow\'s canteen menu and coordinate direct-to-hostel delivery with your timetable schedules at Chandigarh University.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CampusEat',
  },
};

export const viewport: Viewport = {
  themeColor: '#FF6B30',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
      <body className="bg-surface text-text-primary min-h-screen pb-16 md:pb-0 font-sans antialiased">
        <Providers>
          <Navbar />
          <main className="max-w-7xl mx-auto p-4 md:p-8">
            {children}
          </main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}

