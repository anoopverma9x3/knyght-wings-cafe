import { useEffect, useState } from "react";
import {
  TrendingUp,
  ShoppingBag,
  Receipt,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Wallet,
  Package,
  BarChart3,
  Handshake,
  CalendarCheck,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { supabase } from "../lib/supabase";

const getToday = () => {
  const d = new Date();

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
};

const money = (value) =>
  "₹" +
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function Dashboard({ onNavigate }) {
  const [data, setData] = useState({
    opening: null,
    sales: [],
    purchases: [],
    expenses: [],
    settledSales: [],
    settledPurchases: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setError("");

    const date = getToday();

    const results = await Promise.all([
      supabase
        .from("opening_balances")
        .select("*")
        .eq("entry_date", date)
        .maybeSingle(),

      supabase.from("sales").select("*").eq("sale_date", date),

      supabase.from("purchases").select("*").eq("purchase_date", date),

      supabase.from("expenses").select("*").eq("expense_date", date),

      supabase
        .from("sales")
        .select("*")
        .eq("credit_settled", true)
        .eq("settled_at", date),

      supabase
        .from("purchases")
        .select("*")
        .eq("credit_settled", true)
        .eq("settled_at", date),
    ]);

    const failed = results.find((r) => r.error);

    if (failed) {
      setError(failed.error.message);
    } else {
      setData({
        opening: results[0].data,
        sales: results[1].data || [],
        purchases: results[2].data || [],
        expenses: results[3].data || [],
        settledSales: results[4].data || [],
        settledPurchases: results[5].data || [],
      });
    }

    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const sum = (items) =>
    items.reduce(
      (total, item) => total + Number(item.amount || 0),
      0
    );

  const byPayment = (items, method) =>
    sum(items.filter((x) => x.payment_method === method));

  const bySettlement = (items, method) =>
    sum(items.filter((x) => x.settlement_method === method));

  const sales = sum(data.sales);
  const purchases = sum(data.purchases);
  const expenses = sum(data.expenses);

  const creditSales = sum(
    data.sales.filter((x) => x.payment_method === "credit")
  );

  const cashSales = byPayment(data.sales, "cash");
  const upiSales = byPayment(data.sales, "upi");

  const cashCreditReceived = bySettlement(data.settledSales, "cash");
  const upiCreditReceived = bySettlement(data.settledSales, "upi");

  const cashPurchases = byPayment(data.purchases, "cash");
  const upiPurchases = byPayment(data.purchases, "upi");

  const cashCreditPaid = bySettlement(data.settledPurchases, "cash");
  const upiCreditPaid = bySettlement(data.settledPurchases, "upi");

  const cashExpenses = byPayment(data.expenses, "cash");
  const upiExpenses = byPayment(data.expenses, "upi");

  const openingCash = Number(data.opening?.cash || 0);
  const openingUpi = Number(data.opening?.upi || 0);

  const closingCash =
    openingCash +
    cashSales +
    cashCreditReceived -
    cashPurchases -
    cashCreditPaid -
    cashExpenses;

  const closingUpi =
    openingUpi +
    upiSales +
    upiCreditReceived -
    upiPurchases -
    upiCreditPaid -
    upiExpenses;

  const stats = [
    {
      title: "Today's Sales",
      amount: money(sales),
      icon: TrendingUp,
      color: "text-green-700",
      bg: "bg-green-50",
    },
    {
      title: "Purchases",
      amount: money(purchases),
      icon: ShoppingBag,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      title: "Expenses",
      amount: money(expenses),
      icon: Receipt,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      title: "Credit Sales",
      amount: money(creditSales),
      icon: CreditCard,
      color: "text-blue-700",
      bg: "bg-blue-50",
    },
  ];

  const quickActions = [
    {
      label: "Opening Balance",
      page: "Opening Balance",
      icon: Wallet,
    },
    {
      label: "Add Purchase",
      page: "Purchases",
      icon: ShoppingBag,
    },
    {
      label: "Add Expense",
      page: "Expenses",
      icon: Receipt,
    },
    {
      label: "Inventory",
      page: "Stock",
      icon: Package,
    },
    {
      label: "Credit Management",
      page: "Credit",
      icon: Handshake,
    },
    {
      label: "Cashbook",
      page: "Cashbook",
      icon: Wallet,
    },
    {
      label: "Reports",
      page: "Reports",
      icon: BarChart3,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-9 h-9 border-4 border-[#173F35] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 pb-28">
      {/* Welcome and date */}
      <section className="flex justify-between items-center mb-5">
        <div>
          <p className="text-sm text-gray-500">Welcome back</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-1">
            Business Overview
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        <button
          onClick={loadDashboard}
          className="p-3 bg-white border border-gray-100 rounded-xl text-[#173F35] shadow-sm"
          aria-label="Refresh dashboard"
        >
          <RefreshCw size={19} />
        </button>
      </section>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-5 text-sm">
          Database error: {error}

          <button onClick={loadDashboard} className="underline ml-2">
            Retry
          </button>
        </div>
      )}

      {/* Opening balance warning */}
      {!data.opening && (
        <button
          onClick={() => onNavigate("Opening Balance")}
          className="w-full text-left bg-amber-50 border border-amber-200 p-4 rounded-xl mb-5"
        >
          <strong className="text-amber-900">
            Opening balance missing
          </strong>

          <p className="text-sm text-amber-800 mt-1">
            Enter today's opening cash and UPI balance.
          </p>
        </button>
      )}

      {/* Main Sale Action */}
      <button
        onClick={() => onNavigate("Sales")}
        className="w-full bg-[#173F35] hover:bg-[#205747] text-white rounded-2xl p-5 sm:p-6 mb-6 shadow-md flex items-center justify-between transition-all group"
      >
        <div className="text-left">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-white/15 p-2 rounded-lg">
              <Plus size={20} />
            </span>

            <span className="text-xs font-semibold uppercase tracking-wider text-green-200">
              Quick Entry
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold">
            Add New Sale
          </h2>

          <p className="text-sm text-green-100 mt-1">
            Record today's café revenue
          </p>
        </div>

        <div className="bg-white/15 rounded-full p-3 group-hover:translate-x-1 transition-transform">
          <ArrowRight size={25} />
        </div>
      </button>

      {/* Statistics */}
      <section className="mb-7">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg text-gray-800">
            Today's Performance
          </h2>

          <span className="text-xs text-gray-400">Live summary</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.bg} ${item.color}`}
                >
                  <Icon size={21} />
                </div>

                <p className="text-xs text-gray-500 mt-4">
                  {item.title}
                </p>

                <h3 className="text-lg font-bold text-gray-800 mt-1 break-words">
                  {item.amount}
                </h3>
              </div>
            );
          })}
        </div>
      </section>

      {/* Expected balances */}
      <section className="mb-7">
        <h2 className="font-bold text-lg text-gray-800 mb-4">
          Available Balance
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#173F35] text-white rounded-2xl p-5">
            <div className="flex items-center gap-2 text-green-200">
              <Wallet size={18} />
              <p className="text-sm">Expected Cash</p>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold mt-4 break-words">
              {money(closingCash)}
            </h2>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-blue-600">
              <CreditCard size={18} />
              <p className="text-sm">Expected UPI</p>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold mt-4 text-gray-800 break-words">
              {money(closingUpi)}
            </h2>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="mb-7">
        <h2 className="font-bold text-lg text-gray-800 mb-4">
          Quick Actions
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {quickActions.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.page}
                onClick={() => onNavigate(item.page)}
                className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:border-[#173F35] transition-all text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-green-50 text-[#173F35] flex items-center justify-center mb-3">
                  <Icon size={19} />
                </div>

                <span className="text-sm font-semibold text-gray-700">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Daily closing highlight */}
      <button
        onClick={() => onNavigate("Daily Closing")}
        className="w-full flex items-center justify-between gap-3 bg-green-50 border border-green-200 rounded-2xl p-5 mb-7 text-left hover:bg-green-100 transition"
      >
        <div className="flex items-center gap-3">
          <div className="bg-[#173F35] text-white p-3 rounded-xl">
            <CalendarCheck size={22} />
          </div>

          <div>
            <h3 className="font-bold text-[#173F35]">
              Daily Closing
            </h3>

            <p className="text-xs text-gray-500 mt-1">
              Verify and save today's cash and UPI balances
            </p>
          </div>
        </div>

        <ArrowRight size={20} className="text-[#173F35] shrink-0" />
      </button>

      {/* Today's summary */}
      <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-5">
        <h2 className="font-bold text-lg text-gray-800 mb-5">
          Today's Summary
        </h2>

        <div className="space-y-4 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 flex gap-2 items-center">
              <ArrowUpRight size={18} className="text-green-600" />
              Cash sales
            </span>

            <strong>{money(cashSales)}</strong>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-500 flex gap-2 items-center">
              <ArrowUpRight size={18} className="text-blue-600" />
              UPI sales
            </span>

            <strong>{money(upiSales)}</strong>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-500 flex gap-2 items-center">
              <ArrowUpRight size={18} className="text-green-600" />
              Credit received
            </span>

            <strong>
              {money(cashCreditReceived + upiCreditReceived)}
            </strong>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-500 flex gap-2 items-center">
              <ArrowDownRight size={18} className="text-red-600" />
              Supplier credit paid
            </span>

            <strong>
              {money(cashCreditPaid + upiCreditPaid)}
            </strong>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-500 flex gap-2 items-center">
              <ArrowDownRight size={18} className="text-red-600" />
              Purchases + expenses
            </span>

            <strong>{money(purchases + expenses)}</strong>
          </div>
        </div>
      </section>

      {/* Recent transactions */}
      <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg text-gray-800">
            Recent Transactions
          </h2>
        </div>

        {data.sales.length +
          data.purchases.length +
          data.expenses.length ===
        0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            No transactions recorded today.
          </p>
        ) : (
          <div className="space-y-4">
            {[
              ...data.sales.map((x) => ({ ...x, type: "Sale" })),
              ...data.purchases.map((x) => ({
                ...x,
                type: "Purchase",
              })),
              ...data.expenses.map((x) => ({
                ...x,
                type: "Expense",
              })),
            ]
              .sort(
                (a, b) =>
                  new Date(b.created_at) - new Date(a.created_at)
              )
              .slice(0, 8)
              .map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex justify-between items-center border-b border-gray-100 pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-semibold text-sm text-gray-700">
                      {item.type === "Sale"
                        ? item.product_name || "Sale"
                        : item.type}
                    </p>

                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(item.created_at).toLocaleTimeString(
                        "en-IN",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </p>
                  </div>

                  <strong className="text-sm text-gray-800">
                    {money(item.amount)}
                  </strong>
                </div>
              ))}
          </div>
        )}
      </section>
    </main>
  );
}