
import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Save, ShoppingBag, Tag } from "lucide-react";

export default function Sales() {
  const getToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const [date, setDate] = useState(getToday());
  const [productName, setProductName] = useState("");
  const [amount, setAmount] = useState("");
  const [payment, setPayment] = useState("cash");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setSuccess(false);

    const { error } = await supabase.from("sales").insert({
      sale_date: date,
      product_name: productName.trim() || null,
      amount: Number(amount),
      payment_method: payment,
      notes: notes.trim() || null,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setSuccess(true);
      setMessage("Sale recorded successfully!");

      setProductName("");
      setAmount("");
      setNotes("");
      setPayment("cash");
      setDate(getToday());
    }

    setLoading(false);
  }

  return (
    <main className="max-w-2xl mx-auto p-4 md:p-6 pb-28">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-[#173F35] text-white p-3 rounded-xl">
            <ShoppingBag size={23} />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Add Sale
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Record the total sales received by the cafe.
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl p-5 shadow-sm space-y-5"
      >
        {/* Sale date */}
        <div>
          <label className="text-sm font-semibold text-gray-700">
            Sale Date
          </label>

          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-200 rounded-xl p-3 mt-2 outline-none focus:border-[#173F35]"
          />
        </div>

        {/* Optional product name */}
        <div>
          <label className="text-sm font-semibold text-gray-700">
            Product / Sale Name
            <span className="text-gray-400 font-normal ml-2">
              (Optional)
            </span>
          </label>

          <div className="relative mt-2">
            <Tag
              size={18}
              className="absolute left-3 top-3.5 text-gray-400"
            />

            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. Cold Coffee, Burger, Combo"
              maxLength={100}
              className="w-full border border-gray-200 rounded-xl p-3 pl-10 outline-none focus:border-[#173F35]"
            />
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="text-sm font-semibold text-gray-700">
            Total Sale Amount (₹)
          </label>

          <input
            type="number"
            required
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter sale amount"
            className="w-full border border-gray-200 rounded-xl p-3 mt-2 outline-none focus:border-[#173F35]"
          />
        </div>

        {/* Payment method */}
        <div>
          <label className="text-sm font-semibold text-gray-700">
            Payment Method
          </label>

          <div className="grid grid-cols-3 gap-2 mt-2">
            {["cash", "upi", "credit"].map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPayment(method)}
                className={`p-3 rounded-xl border capitalize text-sm font-semibold ${
                  payment === method
                    ? "bg-[#173F35] text-white border-[#173F35]"
                    : "bg-white text-gray-600 border-gray-200"
                }`}
              >
                {method}
              </button>
            ))}
          </div>
        </div>

        {payment === "credit" && (
          <p className="text-sm bg-blue-50 text-blue-800 p-3 rounded-xl">
            This sale will be recorded as customer credit, not as cash
            or UPI received.
          </p>
        )}

        {/* Notes */}
        <div>
          <label className="text-sm font-semibold text-gray-700">
            Notes (Optional)
          </label>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any details..."
            rows={3}
            className="w-full border border-gray-200 rounded-xl p-3 mt-2 resize-none outline-none focus:border-[#173F35]"
          />
        </div>

        {/* Message */}
        {message && (
          <p
            className={`text-sm p-3 rounded-xl ${
              success
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-600"
            }`}
          >
            {message}
          </p>
        )}

        {/* Save */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#173F35] hover:bg-[#205747] text-white rounded-xl p-3.5 font-semibold flex justify-center items-center gap-2 disabled:opacity-60"
        >
          <Save size={18} />
          {loading ? "Saving..." : "Save Sale"}
        </button>
      </form>
    </main>
  );
}
