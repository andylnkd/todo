import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { Button } from './components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './components/ui/card';

export default async function Home() {
  const { userId } = await auth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-2xl mx-auto text-center space-y-8">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Voice Notes to Action Items
        </h1>
        <p className="text-lg text-gray-600">
          Transform your voice recordings into organized action items with AI
        </p>

        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              {userId 
                ? "Continue to your dashboard to manage tasks"
                : "Sign in or create an account to begin"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center p-6">
            {userId ? (
              <Button asChild size="lg">
                <Link href="/dashboard">
                  Go to Dashboard
                </Link>
              </Button>
            ) : (
              <div className="flex gap-4">
                <Button asChild variant="outline" size="lg">
                  <Link href="/sign-in">
                    Sign In
                  </Link>
                </Button>
                <Button asChild size="lg">
                  <Link href="/sign-up">
                    Sign Up
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
