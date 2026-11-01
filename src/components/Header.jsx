import { RefreshCw } from "lucide-react";

export default function Header({ onRefresh }) {
  return (
    <header className="bg-[#173F35] text-white px-5 py-5">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div>
          <p className="text-xs text-green-200">BUSINESS MANAGER</p>
          <h1 className="text-xl font-bold mt-1">
            Knyght Wings Cafe
          </h1>
          <p className="text-xs text-green-200 mt-2">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="p-3 rounded-xl bg-white/10 hover:bg-white/20"
          aria-label="Refresh"
        >
          <RefreshCw size={20} />
        </button>
      </div>
    </header>
  );
}