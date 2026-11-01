
import {
  LayoutDashboard,
  Wallet,
  PlusCircle,
  Package,
  BarChart3,
  Handshake,
} from "lucide-react";

const items = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Cashbook", icon: Wallet },
  { name: "Add", icon: PlusCircle },
  { name: "Stock", icon: Package },
  { name: "Credit", icon: Handshake },
  { name: "Reports", icon: BarChart3 },
];

export default function BottomNav({ activePage, onNavigate }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200">
      <div className="max-w-xl mx-auto flex justify-around items-center py-2 px-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activePage === item.name;

          return (
            <button
              key={item.name}
              onClick={() => onNavigate(item.name)}
              className={`flex flex-col items-center justify-center gap-1 px-2 py-2 min-w-0 text-xs transition-colors ${
                active
                  ? "text-[#173F35] font-bold"
                  : "text-gray-400 hover:text-[#173F35]"
              }`}
            >
              <Icon size={21} strokeWidth={active ? 2.5 : 2} />
              <span>{item.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
