
import {
  LayoutDashboard,
  Wallet,
  Package,
  BarChart3,
  Handshake,
} from "lucide-react";

const items = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Cashbook", icon: Wallet },
  { name: "Stock", icon: Package },
  { name: "Credit", icon: Handshake },
  { name: "Reports", icon: BarChart3 },
];

export default function BottomNav({ activePage, onNavigate }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-4px_15px_rgba(0,0,0,0.04)]">
      <div className="max-w-xl mx-auto grid grid-cols-5 items-center px-2 py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activePage === item.name;

          return (
            <button
              key={item.name}
              onClick={() => onNavigate(item.name)}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 px-1 transition-all duration-200 ${
                active
                  ? "text-[#173F35] bg-green-50"
                  : "text-gray-400 hover:text-[#173F35]"
              }`}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 1.8}
              />

              <span
                className={`text-[11px] whitespace-nowrap ${
                  active ? "font-bold" : "font-medium"
                }`}
              >
                {item.name}
              </span>
            </button>
          );
        })}
      </div>

      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
