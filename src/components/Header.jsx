
import { useState } from "react";
import {
  CalendarDays,
  CircleUserRound,
  LogOut,
  X,
  Mail,
} from "lucide-react";

export default function Header({ email, onLogout }) {
  const [accountOpen, setAccountOpen] = useState(false);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="relative z-40 overflow-visible rounded-b-3xl bg-[#103d30] text-white shadow-lg">

      {/* Background image */}
      <div className="absolute inset-0 overflow-hidden rounded-b-3xl pointer-events-none">
        <img
          src="/cafe-header.png"
          alt="Coffee and wings"
          className="absolute right-0 top-0 h-full w-[48%] object-cover object-right opacity-80"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#103d30] via-[#103d30]/95 to-transparent" />
      </div>

      {/* Account section */}
      <div className="absolute right-4 top-3 z-50">

        <button
          onClick={() => setAccountOpen(!accountOpen)}
          className="rounded-xl bg-white/15 p-2.5 text-white transition hover:bg-white/25"
          aria-label="My Account"
        >
          <CircleUserRound size={23} />
        </button>

        {accountOpen && (
          <div className="absolute right-0 top-14 z-[100] w-[250px] overflow-hidden rounded-2xl border border-green-100 bg-white shadow-2xl text-gray-800">

            {/* Dropdown header */}
            <div className="flex items-center justify-between bg-[#103d30] px-3 py-3 text-white">
              <div className="flex items-center gap-2">
                <CircleUserRound size={18} />
                <h3 className="font-bold text-sm">
                  My Account
                </h3>
              </div>

              <button
                onClick={() => setAccountOpen(false)}
                className="rounded-lg p-1 text-green-100 hover:bg-white/15"
                aria-label="Close account menu"
              >
                <X size={17} />
              </button>
            </div>

            {/* Account details */}
            <div className="p-3">
              <div className="flex items-start gap-2.5 rounded-xl bg-[#f0f7f3] p-2.5">
                <div className="rounded-lg bg-[#dcece2] p-1.5 text-[#173F35]">
                  <Mail size={17} />
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] text-gray-500">
                    Logged in as
                  </p>

                  <p className="mt-1 break-all text-xs font-semibold text-[#173F35]">
                    {email}
                  </p>
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={onLogout}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#173F35] px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-[#205747]"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>

            <div className="h-1 bg-[#173F35]" />
          </div>
        )}
      </div>

      {/* Header content */}
      <div className="relative z-10 flex min-h-[175px] items-center px-5 py-6">
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
      </div>
    </header>
  );
}
