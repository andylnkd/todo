import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import PWARegistration from '@/app/components/PWARegistration';

export const metadata: Metadata = {
  title: 'Innatus',
  description: 'Your intelligent task manager',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Innatus',
  },
};

export const viewport: Viewport = {
  themeColor: '#111827',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen bg-gray-50 antialiased">
          <PWARegistration />
          {children}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
