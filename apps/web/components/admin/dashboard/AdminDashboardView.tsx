"use client";

import Link from "next/link";
import {
  Activity,
  BarChart3,
  BookOpen,
  Coins,
  FileText,
  Newspaper,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ADMIN_QUICK_ACTIONS } from "@/app/admin/_config/navigation";
import type { StakingCutoverPolicySnapshot } from "@/components/admin/staking/types";

const DASHBOARD_TEXT = {
  title: "Welcome to Solera Admin",
  subtitle: "Manage your platform content and system controls",
} as const;

interface DashboardStatCard {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
}

interface DashboardColorMap {
  [key: string]: { bg: string; text: string; border: string };
}

interface DashboardInfraDetails {
  configured: string;
  effective: string;
  degraded: string;
  lastFallback: string;
}

interface DashboardRateLimitInfo {
  value: string;
  color: string;
}

interface AdminDashboardViewProps {
  adminWalletSnippet: string;
  statCards: DashboardStatCard[];
  colorMap: DashboardColorMap;
  rateLimitInfo: DashboardRateLimitInfo;
  infraDetails: DashboardInfraDetails;
  stakingCutoverPolicy: StakingCutoverPolicySnapshot | null;
}

export default function AdminDashboardView({
  adminWalletSnippet,
  statCards,
  colorMap,
  rateLimitInfo,
  infraDetails,
  stakingCutoverPolicy,
}: AdminDashboardViewProps) {
  const cutoverActive =
    (stakingCutoverPolicy?.migrationWindowActive ?? false) ||
    (stakingCutoverPolicy?.freezeLegacyStakeWrites ?? false) ||
    (stakingCutoverPolicy?.freezeLegacyClaimWrites ?? false);

  return (
    <div className="admin-page flex flex-col gap-2 w-full">
      <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4 sm:p-5 shrink-0">
        <h1 className="text-2xl font-bold text-white">{DASHBOARD_TEXT.title}</h1>
        <p className="text-sm text-neutral-400 mt-1">{DASHBOARD_TEXT.subtitle}</p>
      </div>

      {cutoverActive ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-amber-300 shrink-0" />
            <div>
              <div className="text-sm font-semibold text-amber-200">
                Staking Cutover Window Is Active
              </div>
              <div className="mt-1 text-[12px] leading-5 text-amber-100/80">
                {stakingCutoverPolicy?.reason ??
                  "Legacy staking writes are partially frozen while migration operations are in progress."}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider">
                <span className={`rounded-full border px-2 py-1 ${
                  stakingCutoverPolicy?.migrationWindowActive
                    ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                    : "border-neutral-700 bg-neutral-900 text-neutral-400"
                }`}>
                  Migration Window {stakingCutoverPolicy?.migrationWindowActive ? "On" : "Off"}
                </span>
                <span className={`rounded-full border px-2 py-1 ${
                  stakingCutoverPolicy?.freezeLegacyStakeWrites
                    ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                    : "border-neutral-700 bg-neutral-900 text-neutral-400"
                }`}>
                  Stake Freeze {stakingCutoverPolicy?.freezeLegacyStakeWrites ? "On" : "Off"}
                </span>
                <span className={`rounded-full border px-2 py-1 ${
                  stakingCutoverPolicy?.freezeLegacyClaimWrites
                    ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                    : "border-neutral-700 bg-neutral-900 text-neutral-400"
                }`}>
                  Claim Freeze {stakingCutoverPolicy?.freezeLegacyClaimWrites ? "On" : "Off"}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
        {statCards.map((card) => {
          const colors = colorMap[card.color];
          return (
            <div
              key={card.label}
              className={`${colors.bg} border ${colors.border} rounded-xl p-4 flex items-center gap-4`}
            >
              <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${colors.text}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{card.value}</p>
                <p className="text-xs text-neutral-400">{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4 sm:p-5 flex flex-col shrink-0">
        <h3 className="text-sm font-semibold text-white mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {ADMIN_QUICK_ACTIONS.map((action) => {
            if ("disabled" in action && action.disabled) {
              return (
                <div
                  key={action.label}
                  className="flex items-start gap-4 p-4 rounded-xl border bg-neutral-900/30 border-neutral-800/50 cursor-not-allowed opacity-50"
                >
                  <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0">
                    <action.icon className="w-5 h-5 text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{action.label}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{action.desc}</p>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={action.label}
                href={action.href}
                className="flex items-start gap-4 p-4 rounded-xl border bg-[#0a0a0a] border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/30 transition-all cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0">
                  <action.icon className="w-5 h-5 text-neutral-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{action.label}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{action.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4 sm:p-5 shrink-0">
        <h3 className="text-sm font-semibold text-white mb-3">System Information</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "API Status", value: "Online", icon: Activity, color: "text-emerald-400" },
            { label: "Database", value: "PostgreSQL", icon: BarChart3, color: "text-blue-400" },
            {
              label: "Admin Wallet",
              value: adminWalletSnippet,
              icon: Users,
              color: "text-purple-400",
            },
            { label: "Rate Limit", value: rateLimitInfo.value, icon: TrendingUp, color: rateLimitInfo.color },
          ].map((info) => (
            <div
              key={info.label}
              className="flex items-center gap-2 bg-[#0a0a0a] p-3 rounded-lg border border-neutral-800/50"
            >
              <info.icon className={`w-4 h-4 ${info.color}`} />
              <div>
                <p className="text-[10px] text-neutral-500">{info.label}</p>
                <p className="text-xs text-neutral-300 font-medium">{info.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#111111] border border-neutral-800 rounded-xl p-4 sm:p-5 shrink-0">
        <h3 className="text-sm font-semibold text-white mb-3">Infra Status</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Configured Backend", value: infraDetails.configured },
            { label: "Effective Backend", value: infraDetails.effective },
            { label: "Degraded", value: infraDetails.degraded },
            { label: "Last Fallback", value: infraDetails.lastFallback },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-[#0a0a0a] p-3 rounded-lg border border-neutral-800/50"
            >
              <p className="text-[10px] text-neutral-500">{item.label}</p>
              <p className="text-xs text-neutral-300 font-medium mt-1 truncate">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
