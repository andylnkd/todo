import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Innatus",
  description: "Your intelligent task manager",
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
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
