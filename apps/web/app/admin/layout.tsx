"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AdminAppProviders } from "@/components/providers/AdminAppProviders";
import { useAdminAuth } from "@/store/admin/use-admin-auth";
import { useFeedbackToast } from "@/hooks/use-feedback-toast";
import { ADMIN_NAV_ITEMS } from "@/app/admin/_config/navigation";
import Link from "next/link";
import {
  Wrench,
  LogOut,
  Shield,
  Loader2,
  Menu,
  X,
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAppProviders>
      <AdminLayoutShell>{children}</AdminLayoutShell>
    </AdminAppProviders>
  );
}

function AdminLayoutShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, admin, loadProfile, logout, error } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useFeedbackToast({
    scope: "admin-layout:auth",
    error,
    errorTitle: "Admin session issue",
    errorDedupeMs: 12_000,
  });

  // Skip auth check for login page
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (!isLoginPage) {
      loadProfile(true);
    }
  }, [loadProfile, isLoginPage]);

  useEffect(() => {
    if (!isLoginPage && !isLoading && !isAuthenticated) {
      router.push("/admin/login");
    }
  }, [isAuthenticated, isLoading, isLoginPage, router]);

  const handleLogout = async () => {
    if (isDisconnecting) {
      return;
    }

    setIsDisconnecting(true);
    setIsMobileMenuOpen(false);

    try {
      await logout();
      window.location.replace("/admin/login");
    } finally {
      setIsDisconnecting(false);
    }
  };

  let content: React.ReactNode;

  if (isLoginPage) {
    content = <>{children}</>;
  } else if (isLoading) {
    content = (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          <p className="text-sm text-neutral-400">Loading admin panel...</p>
        </div>
      </div>
    );
  } else if (!isAuthenticated) {
    content = null;
  } else {
    content = (
      <div className="admin-shell flex h-screen w-full bg-[#0a0a0a] text-neutral-100 overflow-hidden font-sans p-1.5 sm:p-2 gap-1.5 sm:gap-2">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-[15.5rem] xl:w-64 bg-[#111111] border border-neutral-800 rounded-xl flex-col shrink-0 overflow-hidden">
        {/* Logo */}
        <div className="p-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-emerald-500 flex items-center justify-center border border-purple-500/20">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-[13px] font-bold text-white">Solera Admin</h1>
              <p className="text-[10px] text-neutral-500">Management Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {ADMIN_NAV_ITEMS.map((item) => {
            const isDisabled = Boolean(
              (item as { disabled?: boolean }).disabled,
            );
            const isActive = item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={isDisabled ? "#" : item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    : isDisabled
                    ? "text-neutral-600 cursor-not-allowed"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800/50 cursor-pointer"
                }`}
                onClick={(e) => isDisabled && e.preventDefault()}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
                {isDisabled && (
                  <span className="ml-auto text-[9px] bg-neutral-800 border border-neutral-700 text-neutral-500 px-1.5 py-0.5 rounded-full">
                    Soon
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Admin Info + Logout */}
        <div className="p-3 border-t border-neutral-800 space-y-2 shrink-0">
          {admin && (
            <div className="px-3 py-2 bg-neutral-900/50 rounded-lg border border-neutral-800/80 mb-2">
              <p className="text-[10px] uppercase tracking-wider font-bold text-neutral-500">Connected Wallet</p>
              <p className="text-xs text-neutral-300 font-mono mt-1">
                {admin.walletAddress.slice(0, 4)}...{admin.walletAddress.slice(-4)}
              </p>
              <p className="text-[10px] text-neutral-500 mt-1">
                Role: {admin.role === "CUSTOM" ? (admin.customRoleName || "Custom") : admin.role}
              </p>
            </div>
          )}
          <button
            onClick={handleLogout}
            disabled={isDisconnecting}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
          >
            {isDisconnecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            {isDisconnecting ? "Disconnecting..." : "Disconnect"}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <button
          type="button"
          aria-label="Close admin menu overlay"
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`lg:hidden fixed inset-y-2 left-2 z-50 w-[calc(100vw-1rem)] max-w-[19rem] bg-[#111111] border border-neutral-800 rounded-xl flex flex-col overflow-hidden transition-transform duration-200 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-[110%] pointer-events-none"
        }`}
      >
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-emerald-500 flex items-center justify-center border border-purple-500/20">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-[13px] font-bold text-white">Solera Admin</h1>
              <p className="text-[10px] text-neutral-500">Management Panel</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label="Close admin menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {ADMIN_NAV_ITEMS.map((item) => {
            const isDisabled = Boolean(
              (item as { disabled?: boolean }).disabled,
            );
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={isDisabled ? "#" : item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    : isDisabled
                    ? "text-neutral-600 cursor-not-allowed"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800/50 cursor-pointer"
                }`}
                onClick={(e) => {
                  if (isDisabled) {
                    e.preventDefault();
                    return;
                  }
                  setIsMobileMenuOpen(false);
                }}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
                {isDisabled && (
                  <span className="ml-auto text-[9px] bg-neutral-800 border border-neutral-700 text-neutral-500 px-1.5 py-0.5 rounded-full">
                    Soon
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-neutral-800 space-y-2 shrink-0">
          {admin && (
            <div className="px-3 py-2 bg-neutral-900/50 rounded-lg border border-neutral-800/80 mb-2">
              <p className="text-[10px] uppercase tracking-wider font-bold text-neutral-500">Connected Wallet</p>
              <p className="text-xs text-neutral-300 font-mono mt-1">
                {admin.walletAddress.slice(0, 4)}...{admin.walletAddress.slice(-4)}
              </p>
              <p className="text-[10px] text-neutral-500 mt-1">
                Role: {admin.role === "CUSTOM" ? (admin.customRoleName || "Custom") : admin.role}
              </p>
            </div>
          )}
          <button
            onClick={handleLogout}
            disabled={isDisconnecting}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
          >
            {isDisconnecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            {isDisconnecting ? "Disconnecting..." : "Disconnect"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main flex-1 flex flex-col min-w-0 bg-[#111111] border border-neutral-800 rounded-xl overflow-hidden">
        {/* Top Bar */}
        <header className="h-12 sm:h-14 border-b border-neutral-800 shrink-0 flex items-center justify-between px-3 sm:px-6 z-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden inline-flex items-center justify-center w-8 h-8 rounded-lg border border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              aria-label="Open admin menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <h2 className="text-xs sm:text-sm font-semibold text-white capitalize truncate">
              {pathname === "/admin"
                ? "Dashboard"
                : pathname.split("/").pop()?.replace(/-/g, " ")}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg shadow-[0_0_10px_rgba(16,185,129,0.1)]">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_5px_rgba(52,211,153,0.8)]" />
              <span className="hidden sm:inline text-[11px] text-emerald-400 font-bold tracking-wide">API Connected</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 flex flex-col overflow-y-auto p-1.5 sm:p-2 md:p-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {children}
        </div>
      </main>
      </div>
    );
  }

  return <>{content}</>;
}
