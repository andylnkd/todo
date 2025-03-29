import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voice Notes - AI Task Manager",
  description: "Convert voice notes into actionable tasks",
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
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
