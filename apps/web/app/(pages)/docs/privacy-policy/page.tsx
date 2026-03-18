import Link from "next/link"
import { PublicAppShell } from "@/app/_shared/PublicAppShell"

export default function PrivacyPolicyPage() {
  return (
    <PublicAppShell>
      <main className="flex-1 overflow-y-auto p-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="mx-auto w-full max-w-4xl rounded-xl border border-neutral-800 bg-[#111111] p-6 sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Privacy Policy</h1>
            <Link
              href="/docs"
              className="text-xs sm:text-sm text-neutral-400 hover:text-white underline underline-offset-4 transition-colors"
            >
              Back to Docs
            </Link>
          </div>

          <div className="space-y-4 text-sm leading-7 text-neutral-300">
            <p>
              Solera values your privacy. We do not store wallet private keys or seed phrases.
              Wallet signing happens in your wallet provider.
            </p>
            <p>
              We may process minimal technical metadata required for authentication, session
              continuity, and security monitoring. This data is handled for operational purposes only.
            </p>
            <p>
              By using this platform, you agree to wallet-based authentication flows and the secure
              processing of required request data to provide core functionality.
            </p>
          </div>
        </div>
      </main>
    </PublicAppShell>
  )
}
