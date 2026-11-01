
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Banknote, CreditCard, RefreshCw } from "lucide-react";

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const money = (v) =>
  "₹" + Number(v || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function Cashbook() {
  const [date, setDate] = useState(today());
  const [opening, setOpening] = useState(null);
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    const results = await Promise.all([
      supabase.from("opening_balances").select("*")
        .eq("entry_date", date).maybeSingle(),

      supabase.from("sales").select("*")
        .eq("sale_date", date),

      supabase.from("purchases").select("*")
        .eq("purchase_date", date),

      supabase.from("expenses").select("*")
        .eq("expense_date", date),

      supabase.from("sales").select("*")
        .eq("credit_settled", true)
        .eq("settled_at", date),

      supabase.from("purchases").select("*")
        .eq("credit_settled", true)
        .eq("settled_at", date),
    ]);

    const failed = results.find((r) => r.error);

    if (failed) {
      setError(failed.error.message);
    } else {
      setOpening(results[0].data);
      setSales(results[1].data || []);
      setPurchases(results[2].data || []);
      setExpenses(results[3].data || []);
      setSettledSales(results[4].data || []);
      setSettledPurchases(results[5].data || []);
    }

    setLoading(false);
  }

  const [settledSales, setSettledSales] = useState([]);
  const [settledPurchases, setSettledPurchases] = useState([]);

  useEffect(() => {
    loadData();
  }, [date]);

  const sum = (items) =>
    items.reduce((total, item) => total + Number(item.amount || 0), 0);

  const byPayment = (items, method) =>
    sum(items.filter((x) => x.payment_method === method));

  const bySettlement = (items, method) =>
    sum(items.filter((x) => x.settlement_method === method));

  const openingCash = Number(opening?.cash || 0);
  const openingUpi = Number(opening?.upi || 0);

  const cashSales = byPayment(sales, "cash");
  const upiSales = byPayment(sales, "upi");

  const cashCreditReceived = bySettlement(settledSales, "cash");
  const upiCreditReceived = bySettlement(settledSales, "upi");

  const cashPurchases = byPayment(purchases, "cash");
  const upiPurchases = byPayment(purchases, "upi");

  const cashCreditPaid = bySettlement(settledPurchases, "cash");
  const upiCreditPaid = bySettlement(settledPurchases, "upi");

  const cashExpenses = byPayment(expenses, "cash");
  const upiExpenses = byPayment(expenses, "upi");

  const totalCashIn = cashSales + cashCreditReceived;
  const totalUpiIn = upiSales + upiCreditReceived;

  const totalCashOut = cashPurchases + cashCreditPaid + cashExpenses;
  const totalUpiOut = upiPurchases + upiCreditPaid + upiExpenses;

  const closingCash = openingCash + totalCashIn - totalCashOut;
  const closingUpi = openingUpi + totalUpiIn - totalUpiOut;

  const transactions = [
    ...sales.filter((x) => x.payment_method !== "credit").map((x) => ({
      ...x, type: "Sale", flow: "in", date: x.sale_date,
    })),

    ...purchases.filter((x) => x.payment_method !== "credit").map((x) => ({
      ...x, type: "Purchase", flow: "out", date: x.purchase_date,
    })),

    ...expenses.map((x) => ({
      ...x, type: "Expense", flow: "out", date: x.expense_date,
    })),

    ...settledSales.map((x) => ({
      ...x,
      type: "Credit received",
      flow: "in",
      payment_method: x.settlement_method,
      date: x.settled_at,
    })),

    ...settledPurchases.map((x) => ({
      ...x,
      type: "Credit payment",
      flow: "out",
      payment_method: x.settlement_method,
      date: x.settled_at,
    })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-6 pb-28">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-2xl font-bold">Cashbook</h2>
          <p className="text-sm text-gray-500 mt-1">
            Daily cash and UPI position
          </p>
        </div>

        <button onClick={loadData} className="p-3 bg-white rounded-xl shadow-sm">
          <RefreshCw size={19} />
        </button>
      </div>

      <div className="bg-white rounded-2xl p-4 mb-5">
        <label className="text-sm font-semibold">Select Business Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full border rounded-xl p-3 mt-2"
        />
      </div>

      {loading ? (
        <p className="text-center p-8 text-gray-500">Loading cashbook...</p>
      ) : (
        <>
          {error && (
            <p className="bg-red-50 text-red-700 p-3 rounded-xl mb-4">{error}</p>
          )}

          {!opening && (
            <div className="bg-amber-50 text-amber-900 p-4 rounded-xl mb-5">
              Opening balance has not been entered for this date.
            </div>
          )}

          <section className="grid grid-cols-2 gap-3">
            <div className="bg-[#173F35] text-white rounded-2xl p-5">
              <Banknote size={22} className="text-green-200" />
              <p className="text-sm text-green-200 mt-3">Expected Cash</p>
              <h3 className="text-2xl font-bold mt-2">{money(closingCash)}</h3>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <CreditCard size={22} className="text-blue-600" />
              <p className="text-sm text-gray-500 mt-3">Expected UPI</p>
              <h3 className="text-2xl font-bold mt-2">{money(closingUpi)}</h3>
            </div>
          </section>

          <section className="bg-white rounded-2xl p-5 shadow-sm mt-5">
            <h3 className="font-bold mb-4">Cash Account</h3>
            <div className="space-y-4 text-sm">
              <Row label="Opening balance" value={money(openingCash)} />
              <Row label="Cash sales" value={`+ ${money(cashSales)}`} positive />
              <Row label="Credit received in cash" value={`+ ${money(cashCreditReceived)}`} positive />
              <Row label="Cash purchases" value={`- ${money(cashPurchases)}`} />
              <Row label="Supplier credit paid in cash" value={`- ${money(cashCreditPaid)}`} />
              <Row label="Cash expenses" value={`- ${money(cashExpenses)}`} />
              <div className="border-t pt-4">
                <Row label="Expected closing cash" value={money(closingCash)} bold />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl p-5 shadow-sm mt-4">
            <h3 className="font-bold mb-4">UPI Account</h3>
            <div className="space-y-4 text-sm">
              <Row label="Opening balance" value={money(openingUpi)} />
              <Row label="UPI sales" value={`+ ${money(upiSales)}`} positive />
              <Row label="Credit received through UPI" value={`+ ${money(upiCreditReceived)}`} positive />
              <Row label="UPI purchases" value={`- ${money(upiPurchases)}`} />
              <Row label="Supplier credit paid through UPI" value={`- ${money(upiCreditPaid)}`} />
              <Row label="UPI expenses" value={`- ${money(upiExpenses)}`} />
              <div className="border-t pt-4">
                <Row label="Expected closing UPI" value={money(closingUpi)} bold />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl p-5 shadow-sm mt-4">
            <h3 className="font-bold mb-4">Transactions</h3>

            {transactions.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">
                No transactions for this date.
              </p>
            ) : (
              <div className="space-y-4">
                {transactions.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="flex justify-between items-center border-b pb-3"
                  >
                    <div>
                      <p className="font-semibold text-sm">{item.type}</p>
                      <p className="text-xs text-gray-400 capitalize mt-1">
                        {item.payment_method}
                      </p>
                    </div>
                    <strong className={item.flow === "in" ? "text-green-700" : "text-red-600"}>
                      {item.flow === "in" ? "+" : "-"}{money(item.amount)}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function Row({ label, value, positive, bold }) {
  return (
    <div className="flex justify-between gap-3">
      <span className={bold ? "font-bold" : "text-gray-500"}>{label}</span>
      <strong className={`${positive ? "text-green-700" : ""} ${bold ? "text-[#173F35]" : ""}`}>
        {value}
      </strong>
    </div>
  );
}
