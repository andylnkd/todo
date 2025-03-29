import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-white shadow-lg rounded-lg",
            headerTitle: "text-2xl font-bold text-center",
            headerSubtitle: "text-gray-600 text-center",
            socialButtonsBlockButton: "border border-gray-300 hover:bg-gray-50",
            formFieldLabel: "text-gray-700",
            formFieldInput: "rounded-md border-gray-300",
            submitButton: "bg-blue-600 hover:bg-blue-700 text-white",
          },
        }}
        routing="path"
        path="/sign-up"
      />
    </div>
  );
} 