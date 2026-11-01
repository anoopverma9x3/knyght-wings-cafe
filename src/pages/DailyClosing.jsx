
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  Wallet,
  CalendarDays,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });

const sum = (rows, field = "amount") =>
  (rows || []).reduce((total, row) => total + Number(row[field] || 0), 0);

export default function DailyClosing() {
  const [date, setDate] = useState(getToday());
  const [expectedCash, setExpectedCash] = useState(0);
  const [expectedUpi, setExpectedUpi] = useState(0);
  const [actualCash, setActualCash] = useState("");
  const [actualUpi, setActualUpi] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [hasOpening, setHasOpening] = useState(false);

  const cashDifference =
    actualCash === "" ? null : Number(actualCash) - expectedCash;

  const upiDifference =
    actualUpi === "" ? null : Number(actualUpi) - expectedUpi;

  useEffect(() => {
    loadClosingData();
  }, [date]);

  async function loadClosingData() {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const [
        openingResult,
        salesResult,
        purchasesResult,
        expensesResult,
        settledSalesResult,
        settledPurchasesResult,
        closingResult,
      ] = await Promise.all([
        supabase
          .from("opening_balances")
          .select("cash, upi")
          .eq("entry_date", date)
          .maybeSingle(),

        supabase
          .from("sales")
          .select("amount, payment_method")
          .eq("sale_date", date),

        supabase
          .from("purchases")
          .select("amount, payment_method")
          .eq("purchase_date", date),

        supabase
          .from("expenses")
          .select("amount, payment_method")
          .eq("expense_date", date),

        supabase
          .from("sales")
          .select("amount, settlement_method")
          .eq("payment_method", "credit")
          .eq("credit_settled", true)
          .eq("settled_at", date),

        supabase
          .from("purchases")
          .select("amount, settlement_method")
          .eq("payment_method", "credit")
          .eq("credit_settled", true)
          .eq("settled_at", date),

        supabase
          .from("daily_closings")
          .select("actual_cash, actual_upi")
          .eq("closing_date", date)
          .maybeSingle(),
      ]);

      const results = [
        openingResult,
        salesResult,
        purchasesResult,
        expensesResult,
        settledSalesResult,
        settledPurchasesResult,
        closingResult,
      ];

      const failed = results.find((result) => result.error);
      if (failed) throw failed.error;

      const opening = openingResult.data || { cash: 0, upi: 0 };
      setHasOpening(Boolean(openingResult.data));

      const sales = salesResult.data || [];
      const purchases = purchasesResult.data || [];
      const expenses = expensesResult.data || [];
      const settledSales = settledSalesResult.data || [];
      const settledPurchases = settledPurchasesResult.data || [];

      const cashSales = sum(
        sales.filter((row) => row.payment_method === "cash")
      );
      const upiSales = sum(
        sales.filter((row) => row.payment_method === "upi")
      );

      const cashPurchases = sum(
        purchases.filter((row) => row.payment_method === "cash")
      );
      const upiPurchases = sum(
        purchases.filter((row) => row.payment_method === "upi")
      );

      const cashExpenses = sum(
        expenses.filter((row) => row.payment_method === "cash")
      );
      const upiExpenses = sum(
        expenses.filter((row) => row.payment_method === "upi")
      );

      const cashCreditReceived = sum(
        settledSales.filter((row) => row.settlement_method === "cash")
      );
      const upiCreditReceived = sum(
        settledSales.filter((row) => row.settlement_method === "upi")
      );

      const cashSupplierPayments = sum(
        settledPurchases.filter((row) => row.settlement_method === "cash")
      );
      const upiSupplierPayments = sum(
        settledPurchases.filter((row) => row.settlement_method === "upi")
      );

      const calculatedCash =
        Number(opening.cash || 0) +
        cashSales +
        cashCreditReceived -
        cashPurchases -
        cashSupplierPayments -
        cashExpenses;

      const calculatedUpi =
        Number(opening.upi || 0) +
        upiSales +
        upiCreditReceived -
        upiPurchases -
        upiSupplierPayments -
        upiExpenses;

      setExpectedCash(calculatedCash);
      setExpectedUpi(calculatedUpi);

      setActualCash(
        closingResult.data ? String(closingResult.data.actual_cash) : ""
      );
      setActualUpi(
        closingResult.data ? String(closingResult.data.actual_upi) : ""
      );
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not load closing data.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (actualCash === "" || actualUpi === "") {
      setError("Enter both actual cash and actual UPI balances.");
      return;
    }

    if (
      !Number.isFinite(Number(actualCash)) ||
      !Number.isFinite(Number(actualUpi)) ||
      Number(actualCash) < 0 ||
      Number(actualUpi) < 0
    ) {
      setError("Enter valid non-negative balances.");
      return;
    }

    setSaving(true);

    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError || !userData.user) {
      setSaving(false);
      setError("Please log in again.");
      return;
    }

    const cash = Number(actualCash);
    const upi = Number(actualUpi);

    const { error: saveError } = await supabase
      .from("daily_closings")
      .upsert(
        {
          user_id: userData.user.id,
          closing_date: date,
          expected_cash: expectedCash,
          actual_cash: cash,
          cash_difference: cash - expectedCash,
          expected_upi: expectedUpi,
          actual_upi: upi,
          upi_difference: upi - expectedUpi,
        },
        { onConflict: "user_id,closing_date" }
      );

    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    setMessage("Daily closing saved successfully!");
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center text-gray-500">
        Loading closing details...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pt-5 pb-28">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-[#173F35] text-white p-3 rounded-xl">
          <Wallet size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Daily Closing
          </h2>
          <p className="text-sm text-gray-500">
            Match your actual balance with expected balance
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Closing Date
        </label>
        <div className="relative">
          <CalendarDays
            size={18}
            className="absolute left-3 top-3.5 text-gray-400"
          />
          <input
            type="date"
            value={date}
            max={getToday()}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 outline-none focus:border-[#173F35]"
          />
        </div>

        {!hasOpening && (
          <p className="mt-3 text-sm text-orange-600">
            No opening balance was found for this date. Expected balances
            are calculated starting from ₹0.
          </p>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Cash closing */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <IndianRupee className="text-[#173F35]" size={21} />
            <h3 className="font-bold text-gray-800">Cash Closing</h3>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <p className="text-sm text-gray-500">Expected Cash</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">
              {money(expectedCash)}
            </p>
          </div>

          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Actual Cash Counted
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={actualCash}
            onChange={(e) => setActualCash(e.target.value)}
            placeholder="Enter cash in drawer"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#173F35]"
            required
          />

          {cashDifference !== null && (
            <div className="mt-3 flex justify-between items-center text-sm">
              <span className="text-gray-500">Cash Difference</span>
              <strong
                className={
                  cashDifference < 0
                    ? "text-red-600"
                    : cashDifference > 0
                    ? "text-green-600"
                    : "text-gray-700"
                }
              >
                {cashDifference > 0 ? "+" : ""}
                {money(cashDifference)}
              </strong>
            </div>
          )}
        </div>

        {/* UPI closing */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="text-[#173F35]" size={21} />
            <h3 className="font-bold text-gray-800">UPI Closing</h3>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <p className="text-sm text-gray-500">Expected UPI</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">
              {money(expectedUpi)}
            </p>
          </div>

          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Actual UPI Balance
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={actualUpi}
            onChange={(e) => setActualUpi(e.target.value)}
            placeholder="Enter actual UPI balance"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#173F35]"
            required
          />

          {upiDifference !== null && (
            <div className="mt-3 flex justify-between items-center text-sm">
              <span className="text-gray-500">UPI Difference</span>
              <strong
                className={
                  upiDifference < 0
                    ? "text-red-600"
                    : upiDifference > 0
                    ? "text-green-600"
                    : "text-gray-700"
                }
              >
                {upiDifference > 0 ? "+" : ""}
                {money(upiDifference)}
              </strong>
            </div>
          )}
        </div>

        {/* Overall difference */}
        {cashDifference !== null && upiDifference !== null && (
          <div className="bg-[#173F35] text-white rounded-2xl p-5">
            <p className="text-sm text-green-100">Total Difference</p>
            <p className="text-3xl font-bold mt-1">
              {money(cashDifference + upiDifference)}
            </p>
            <p className="text-xs text-green-100 mt-2">
              Positive means actual balance is higher; negative means it is
              lower than expected.
            </p>
          </div>
        )}

        {message && (
          <div className="flex gap-2 items-center rounded-xl bg-green-50 text-green-700 p-3 text-sm">
            <CheckCircle2 size={18} />
            {message}
          </div>
        )}

        {error && (
          <div className="flex gap-2 items-center rounded-xl bg-red-50 text-red-700 p-3 text-sm">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-[#173F35] hover:bg-[#205747] disabled:opacity-60 text-white font-semibold py-4 rounded-xl"
        >
          {saving ? "Saving Closing..." : "Save Daily Closing"}
        </button>
      </form>
    </div>
  );
}
