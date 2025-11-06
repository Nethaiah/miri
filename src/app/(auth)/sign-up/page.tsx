import { SignupForm } from "@/features/auth/sign-up/components/signup-form"
import localFont from "next/font/local";
import Link from "next/link"

const oughter = localFont({
  src: "../../../fonts/Oughter.woff2",
});

export default function SignupPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className={`flex items-center gap-2 self-center font-medium text-2xl ${oughter.className}`}>
          MiriNote
        </Link>
        <SignupForm />
      </div>
    </div>
  )
}
