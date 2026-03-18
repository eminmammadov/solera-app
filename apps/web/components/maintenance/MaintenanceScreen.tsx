import Image from "next/image";

interface MaintenanceScreenProps {
  maintenanceMessage?: string | null;
  maintenanceStartsAt?: string | null;
}

const MAINTENANCE_TEXT = {
  title: "Scheduled Maintenance In Progress",
  subtitle:
    "Solera is currently under maintenance to improve performance and security.",
  fallbackMessage:
    "Please check back shortly. We appreciate your patience while we complete this update.",
  statusTitle: "System Status",
  statusValue: "Maintenance Active",
  etaTitle: "Planned Start",
  signedBy: "Solera Infrastructure Team",
} as const;

const formatDateTime = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

export function MaintenanceScreen({
  maintenanceMessage,
  maintenanceStartsAt,
}: MaintenanceScreenProps) {
  const formattedStartsAt = formatDateTime(maintenanceStartsAt);

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#0a0a0a] px-4 py-8 text-neutral-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-20 h-64 w-64 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[100px]" />
        <div className="absolute bottom-10 right-10 h-48 w-48 rounded-full bg-blue-500/10 blur-[90px]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }} />
      </div>

      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-neutral-800 bg-[#111111] shadow-2xl">
        <div className="border-b border-neutral-800 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-full border border-neutral-700 bg-black">
              <Image
                src="/logos/ra-white-logo.png"
                alt="Solera logo"
                width={40}
                height={40}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Solera Work</p>
              <p className="text-[11px] text-neutral-500">{MAINTENANCE_TEXT.signedBy}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6 px-6 py-7">
          <div>
            <h1 className="text-2xl font-bold text-white">{MAINTENANCE_TEXT.title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">
              {MAINTENANCE_TEXT.subtitle}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-neutral-300">
              {maintenanceMessage?.trim() || MAINTENANCE_TEXT.fallbackMessage}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-neutral-800 bg-[#0c0c0c] p-4">
              <p className="text-[11px] uppercase tracking-wider text-neutral-500">
                {MAINTENANCE_TEXT.statusTitle}
              </p>
              <p className="mt-1 text-sm font-semibold text-emerald-400">
                {MAINTENANCE_TEXT.statusValue}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-[#0c0c0c] p-4">
              <p className="text-[11px] uppercase tracking-wider text-neutral-500">
                {MAINTENANCE_TEXT.etaTitle}
              </p>
              <p className="mt-1 text-sm font-semibold text-neutral-200">
                {formattedStartsAt ?? "Immediate"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

