import { RefreshCw, CalendarDays } from "lucide-react";

export default function Header({ onRefresh }) {
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="relative overflow-hidden rounded-b-3xl bg-[#103d30] text-white shadow-lg">
      {/* Food image on the right */}
      <img
        src="/cafe-header.png"
        alt="Coffee and wings"
        className="absolute right-0 top-0 h-full w-[48%] object-cover object-right opacity-80"
      />

      {/* Dark overlay for readable text */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#103d30] via-[#103d30]/95 to-transparent" />

      <div className="relative z-10 flex min-h-[175px] items-center justify-between px-5 py-6">
        <div className="max-w-[75%]">
          <p className="text-xs font-semibold tracking-[2px] text-green-300">
            BUSINESS MANAGER
          </p>

          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            Knyght Wings Cafe
          </h1>

          <p className="mt-4 flex items-center gap-2 text-xs text-green-100">
            <CalendarDays size={15} />
            {today}
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="relative z-20 rounded-xl bg-white/15 p-3 transition hover:bg-white/25"
          aria-label="Refresh"
        >
          <RefreshCw size={20} />
        </button>
      </div>
    </header>
  );
}