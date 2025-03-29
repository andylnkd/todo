import { SignIn } from "@clerk/nextjs";
import { Card } from "@/components/ui/card";

export default function SignInPage() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-4 sm:p-8">
      <div className="w-full max-w-[440px] mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Welcome Back</h1>
          <p className="text-gray-500">Sign in to continue to your account</p>
        </div>

        <Card className="p-0 shadow-xl">
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "border-0 shadow-none",
                headerTitle: "text-2xl font-bold",
                headerSubtitle: "text-gray-500",
                socialButtonsBlockButton: "border border-gray-300 hover:bg-gray-50 transition-colors",
                formFieldLabel: "text-gray-700 font-medium",
                formFieldInput: "border-gray-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all",
                formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white transition-colors",
                footerActionLink: "text-blue-600 hover:text-blue-700",
                dividerLine: "bg-gray-200",
                dividerText: "text-gray-500",
              },
              layout: {
                socialButtonsPlacement: "bottom",
                privacyPageUrl: "/privacy",
                termsPageUrl: "/terms",
              },
            }}
            routing="path"
            path="/sign-in"
          />
        </Card>
      </div>
    </div>
  );
} 