"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useAdminAuth } from "@/store/admin/use-admin-auth";
import { useRouter } from "next/navigation";
import { useFeedbackToast } from "@/hooks/use-feedback-toast";
import { Shield, Wallet, ArrowRight, Loader2 } from "lucide-react";
import bs58 from "bs58";
import Image from "next/image";

const LOGIN_TEXT = {
  title: "Admin Panel",
  subtitle: "Connect your Solana wallet to authenticate",
  step1: "Connect Wallet",
  step1Desc: "Connect your Phantom, Solflare, or any Solana wallet",
  step2: "Sign Message",
  step2Desc: "Sign a verification message to prove wallet ownership",
  step3: "Access Panel",
  step3Desc: "If your wallet is authorized, you'll be redirected to the dashboard",
  connectButton: "Connect Wallet to Continue",
  signButton: "Sign & Authenticate",
  signing: "Signing...",
  error: "Authentication failed. Your wallet may not be authorized.",
} as const;

export default function AdminLoginPage() {
  const { publicKey, signMessage, connected } = useWallet();
  const { verifyWallet, getNonce, isAuthenticated, isLoading, error, loadProfile } = useAdminAuth();
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const [signing, setSigning] = useState(false);

  useFeedbackToast({
    scope: "admin-login",
    error,
    errorTitle: "Admin Authentication Error",
    errorDedupeMs: 8_000,
  });

  const uiConnected = isHydrated && connected;
  const uiPublicKey = isHydrated ? publicKey : null;

  // Check existing token on mount
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/admin");
    }
  }, [isAuthenticated, router]);

  const handleAuthenticate = async () => {
    if (!publicKey || !signMessage) return;

    setSigning(true);
    try {
      // 1. Get nonce message from server
      const message = await getNonce(publicKey.toBase58());

      // 2. Sign message with wallet
      const encodedMessage = new TextEncoder().encode(message);
      const signatureBytes = await signMessage(encodedMessage);
      const signature = bs58.encode(signatureBytes);

      // 3. Verify with backend
      const success = await verifyWallet(
        publicKey.toBase58(),
        signature,
        message
      );

      if (success) {
        router.push("/admin");
      }
    } catch {
      // useAdminAuth store already captures and exposes a user-facing error message.
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      {/* Background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-emerald-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Solera</h1>
              <p className="text-xs text-neutral-500">{LOGIN_TEXT.title}</p>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-6 sm:p-8">
          <div className="text-center mb-8">
            <h2 className="text-lg font-semibold text-white mb-2">{LOGIN_TEXT.subtitle}</h2>
          </div>

          {/* Steps */}
          <div className="space-y-4 mb-8">
            {[
              { icon: Wallet, label: LOGIN_TEXT.step1, desc: LOGIN_TEXT.step1Desc, done: uiConnected },
              { icon: Shield, label: LOGIN_TEXT.step2, desc: LOGIN_TEXT.step2Desc, done: isAuthenticated },
              { icon: ArrowRight, label: LOGIN_TEXT.step3, desc: LOGIN_TEXT.step3Desc, done: false },
            ].map((step, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
                  step.done
                    ? "bg-emerald-500/10 border border-emerald-500/20"
                    : "bg-neutral-900/50 border border-neutral-800/50"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    step.done
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-neutral-800 text-neutral-500"
                  }`}
                >
                  <step.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className={`text-sm font-medium ${step.done ? "text-emerald-400" : "text-white"}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {!uiConnected ? (
              <div className="flex justify-center">
                {isHydrated ? (
                  <WalletMultiButton />
                ) : (
                  <button
                    disabled
                    className="wallet-adapter-button wallet-adapter-button-trigger !opacity-70 !cursor-not-allowed"
                  >
                    Select Wallet
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={handleAuthenticate}
                disabled={signing || isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {signing || isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {LOGIN_TEXT.signing}
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    {LOGIN_TEXT.signButton}
                  </>
                )}
              </button>
            )}

            {uiConnected && uiPublicKey && (
              <p className="text-xs text-neutral-500 text-center">
                Connected: {uiPublicKey.toBase58().slice(0, 4)}...{uiPublicKey.toBase58().slice(-4)}
              </p>
            )}

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-xs text-red-400 text-center">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-neutral-600 mt-6">
          Only authorized wallets can access the admin panel
        </p>
      </div>
    </div>
  );
}
