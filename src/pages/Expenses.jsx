
import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Save, Receipt } from "lucide-react";

export default function Expenses() {
  const getToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const [date, setDate] = useState(getToday());
  const [category, setCategory] = useState("Electricity");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [payment, setPayment] = useState("cash");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.from("expenses").insert({
      expense_date: date,
      category,
      description: description.trim() || null,
      amount: Number(amount),
      payment_method: payment,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Expense recorded successfully!");
      setDescription("");
      setAmount("");
      setCategory("Electricity");
      setPayment("cash");
    }

    setLoading(false);
  }

  return (
    <main className="max-w-2xl mx-auto p-4 md:p-6 pb-28">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Add Expense</h2>
        <p className="text-sm text-gray-500 mt-1">
          Record your cafe's operating expenses.
        </p>
      </div>

      <form onSubmit={handleSubmit}
        className="bg-white rounded-2xl p-5 shadow-sm space-y-5">

        <div>
          <label className="text-sm font-semibold">Expense Date</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border rounded-xl p-3 mt-2"
          />
        </div>

        <div>
          <label className="text-sm font-semibold">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border rounded-xl p-3 mt-2 bg-white"
          >
            <option>Electricity</option>
            <option>Rent</option>
            <option>Salary</option>
            <option>Transport</option>
            <option>Maintenance</option>
            <option>Internet</option>
            <option>Packaging</option>
            <option>Cleaning</option>
            <option>Marketing</option>
            <option>Other</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold">Description</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional details"
            className="w-full border rounded-xl p-3 mt-2"
          />
        </div>

        <div>
          <label className="text-sm font-semibold">Amount (₹)</label>
          <input
            type="number"
            required
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter expense amount"
            className="w-full border rounded-xl p-3 mt-2"
          />
        </div>

        <div>
          <label className="text-sm font-semibold">Payment Method</label>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {["cash", "upi"].map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPayment(method)}
                className={`p-3 rounded-xl border capitalize font-semibold ${
                  payment === method
                    ? "bg-[#173F35] text-white border-[#173F35]"
                    : "bg-white text-gray-600"
                }`}
              >
                {method}
              </button>
            ))}
          </div>
        </div>

        {message && (
          <p className={`text-sm ${
            message === "Expense recorded successfully!"
              ? "text-green-700"
              : "text-red-600"
          }`}>
            {message}
          </p>
        )}

        <button
          disabled={loading}
          className="w-full bg-[#173F35] text-white rounded-xl p-3 font-semibold flex justify-center items-center gap-2 disabled:opacity-60"
        >
          <Save size={18} />
          {loading ? "Saving..." : "Save Expense"}
        </button>
      </form>
    </main>
  );
}
