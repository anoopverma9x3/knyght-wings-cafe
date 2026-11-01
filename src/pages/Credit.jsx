
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Users, Truck, RefreshCw, CheckCircle2, Clock } from "lucide-react";

export default function Credit() {
  const [tab, setTab] = useState("customers");
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [settlementMethods, setSettlementMethods] = useState({});

  const today = new Date().toLocaleDateString("en-CA");

  async function loadData() {
    setLoading(true);

    const [salesResult, purchasesResult] = await Promise.all([
      supabase
        .from("sales")
        .select("*")
        .eq("payment_method", "credit")
        .order("sale_date", { ascending: false }),

      supabase
        .from("purchases")
        .select("*")
        .eq("payment_method", "credit")
        .order("purchase_date", { ascending: false }),
    ]);

    if (salesResult.error || purchasesResult.error) {
      alert(salesResult.error?.message || purchasesResult.error?.message);
    } else {
      setSales(salesResult.data || []);
      setPurchases(purchasesResult.data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const isCustomer = tab === "customers";
  const transactions = isCustomer ? sales : purchases;
  const dateField = isCustomer ? "sale_date" : "purchase_date";

  const pending = transactions.filter((item) => !item.credit_settled);
  const completed = transactions.filter((item) => item.credit_settled);

  const pendingAmount = pending.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const completedAmount = completed.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  function money(value) {
    return Number(value || 0).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    });
  }

  async function settleTransaction(transaction) {
    const method = settlementMethods[transaction.id] || "cash";
    const confirmed = window.confirm(
      isCustomer
        ? "Confirm that this customer payment has been received?"
        : "Confirm that this supplier payment has been paid?"
    );

    if (!confirmed) return;

    setUpdating(transaction.id);

    const table = isCustomer ? "sales" : "purchases";

    const { error } = await supabase
      .from(table)
      .update({
        credit_settled: true,
        settlement_method: method,
        settled_at: today,
      })
      .eq("id", transaction.id);

    setUpdating(null);

    if (error) {
      alert(error.message);
      return;
    }

    loadData();
  }

  async function undoSettlement(transaction) {
    const confirmed = window.confirm(
      "Mark this transaction as pending again?"
    );

    if (!confirmed) return;

    setUpdating(transaction.id);

    const table = isCustomer ? "sales" : "purchases";

    const { error } = await supabase
      .from(table)
      .update({
        credit_settled: false,
        settlement_method: null,
        settled_at: null,
      })
      .eq("id", transaction.id);

    setUpdating(null);

    if (error) {
      alert(error.message);
      return;
    }

    loadData();
  }

  function TransactionCard({ item, settled }) {
    return (
      <div className="border border-gray-100 rounded-xl p-4 mb-3">
        <div className="flex justify-between gap-3">
          <div>
            <p className="font-bold text-gray-900">{money(item.amount)}</p>
            <p className="text-sm text-gray-500 mt-1">
              {new Date(item[dateField] + "T00:00:00").toLocaleDateString("en-IN")}
            </p>
            {item.notes && (
              <p className="text-xs text-gray-500 mt-1">{item.notes}</p>
            )}
          </div>

          <div className="text-right">
            <p className={`text-xs font-semibold flex items-center gap-1 justify-end ${
              settled ? "text-green-700" : "text-orange-600"
            }`}>
              {settled ? <CheckCircle2 size={14} /> : <Clock size={14} />}
              {settled ? "Settled" : "Pending"}
            </p>
            {settled && (
              <p className="text-xs text-gray-500 mt-2">
                {item.settlement_method?.toUpperCase()} · {item.settled_at}
              </p>
            )}
          </div>
        </div>

        {!settled ? (
          <div className="flex gap-2 mt-4">
            <select
              value={settlementMethods[item.id] || "cash"}
              onChange={(e) =>
                setSettlementMethods((prev) => ({
                  ...prev,
                  [item.id]: e.target.value,
                }))
              }
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="cash">Cash received/paid</option>
              <option value="upi">UPI received/paid</option>
            </select>

            <button
              onClick={() => settleTransaction(item)}
              disabled={updating === item.id}
              className="bg-[#173F35] text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {updating === item.id ? "Saving..." : "Settle"}
            </button>
          </div>
        ) : (
          <button
            onClick={() => undoSettlement(item)}
            disabled={updating === item.id}
            className="mt-3 text-sm text-red-600 font-medium disabled:opacity-50"
          >
            Undo settlement
          </button>
        )}
      </div>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 pt-5 pb-28">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Credit Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            Track pending and settled transactions
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-3 bg-white border border-gray-200 rounded-xl"
          aria-label="Refresh"
        >
          <RefreshCw size={19} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <button
          onClick={() => setTab("customers")}
          className={`p-4 rounded-2xl border text-left ${
            isCustomer
              ? "bg-[#173F35] text-white border-[#173F35]"
              : "bg-white text-gray-700 border-gray-200"
          }`}
        >
          <Users size={22} />
          <p className="font-bold mt-3">Customer Credit</p>
          <p className="text-xs mt-1 opacity-80">Money to receive</p>
        </button>

        <button
          onClick={() => setTab("suppliers")}
          className={`p-4 rounded-2xl border text-left ${
            !isCustomer
              ? "bg-[#173F35] text-white border-[#173F35]"
              : "bg-white text-gray-700 border-gray-200"
          }`}
        >
          <Truck size={22} />
          <p className="font-bold mt-3">Supplier Credit</p>
          <p className="text-xs mt-1 opacity-80">Money to pay</p>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Pending</p>
          <p className="text-xl font-bold text-orange-600 mt-2">
            {money(pendingAmount)}
          </p>
          <p className="text-xs text-gray-400 mt-1">{pending.length} transactions</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Settled</p>
          <p className="text-xl font-bold text-green-700 mt-2">
            {money(completedAmount)}
          </p>
          <p className="text-xs text-gray-400 mt-1">{completed.length} transactions</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-500">
          Loading transactions...
        </div>
      ) : (
        <>
          <section className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
            <h3 className="font-bold mb-4">
              {isCustomer ? "Pending customer payments" : "Pending supplier payments"}
            </h3>

            {pending.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-5">
                No pending transactions.
              </p>
            ) : (
              pending.map((item) => (
                <TransactionCard key={item.id} item={item} settled={false} />
              ))
            )}
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-bold mb-4">Settlement history</h3>

            {completed.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-5">
                No settled transactions yet.
              </p>
            ) : (
              completed.map((item) => (
                <TransactionCard key={item.id} item={item} settled />
              ))
            )}
          </section>
        </>
      )}
    </main>
  );
}
