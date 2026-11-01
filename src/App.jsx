
import { useEffect, useState } from "react";

import { supabase } from "./lib/supabase";

import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import OpeningBalance from "./pages/OpeningBalance";

import Header from "./components/Header";
import BottomNav from "./components/BottomNav";
import Sales from "./pages/Sales";
import Purchases from "./pages/Purchases";
import Expenses from "./pages/Expenses";
import Cashbook from "./pages/Cashbook";
import Credit from "./pages/Credit";
import Inventory from "./pages/Inventory";
import Reports from "./pages/Reports";
import DailyClosing from "./pages/DailyClosing";

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState("Dashboard");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error(error);
      setSession(data?.session ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) setActivePage("Dashboard");
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert(error.message);
    }
  }

  function renderPage() {
    switch (activePage) {
      case "Dashboard":
        return (
          <Dashboard
            key={refreshKey}
            onNavigate={setActivePage}
          />
        );

      case "Opening Balance":
        return <OpeningBalance />;
      case "Sales":
        return <Sales />;
      case "Purchases":
        return <Purchases />;
      case "Expenses":
         return <Expenses />;
      case "Cashbook":
        return <Cashbook />;
      case "Credit":
        return <Credit key={refreshKey} />;
      case "Stock":
        return <Inventory key={refreshKey} />;
      case "Reports":
        return <Reports key={refreshKey} />;
      case "Daily Closing":
          return <DailyClosing key={refreshKey} />;

      default:
        return (
          <div className="max-w-4xl mx-auto p-6 pb-28">
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <h2 className="text-xl font-bold text-gray-800">
                {activePage}
              </h2>

              <p className="text-gray-500 mt-2">
                This module will be implemented next.
              </p>

              <button
                onClick={() => setActivePage("Dashboard")}
                className="mt-5 bg-[#173F35] text-white px-5 py-3 rounded-xl"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        );
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f7f5]">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-[#f5f7f5]">
      <Header
        onRefresh={() => setRefreshKey((key) => key + 1)}
      />

      <div className="max-w-6xl mx-auto px-4 pt-3 flex justify-end">
        <button
          onClick={handleLogout}
          className="text-sm text-red-600 font-medium px-3 py-2"
        >
          Logout
        </button>
      </div>

      {renderPage()}

      <BottomNav
        activePage={activePage}
        onNavigate={setActivePage}
      />
    </div>
  );
}
