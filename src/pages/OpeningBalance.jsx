import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Wallet, Save, CalendarDays } from "lucide-react";

export default function OpeningBalance() {
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const [date, setDate] = useState(today());
  const [cash, setCash] = useState("");
  const [upi, setUpi] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadBalance() {
      const { data, error } = await supabase
        .from("opening_balances")
        .select("*")
        .eq("entry_date", date)
        .maybeSingle();

      if (!error && data) {
        setCash(String(data.cash ?? 0));
        setUpi(String(data.upi ?? 0));
      } else {
        setCash("");
        setUpi("");
      }
    }

    loadBalance();
  }, [date]);

  async function saveBalance(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase
      .from("opening_balances")
      .upsert(
        {
          entry_date: date,
          cash: Number(cash || 0),
          upi: Number(upi || 0),
        },
        { onConflict: "user_id,entry_date" }
      );

    setMessage(error ? error.message : "Opening balance saved successfully!");
    setLoading(false);
  }

  const total = Number(cash || 0) + Number(upi || 0);

  return (
    <main className="max-w-2xl mx-auto p-4 md:p-6 pb-28">
      <h2 className="text-2xl font-bold text-gray-900">
        Opening Balance
      </h2>
      <p className="text-sm text-gray-500 mt-1 mb-6">
        Enter the available cash and UPI balance before business starts.
      </p>

      <form
        onSubmit={saveBalance}
        className="bg-white rounded-2xl p-5 shadow-sm space-y-5"
      >
        <div>
          <label className="text-sm font-semibold flex items-center gap-2">
            <CalendarDays size={17} /> Business Date
          </label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border rounded-xl p-3 mt-2"
          />
        </div>

        <div>
          <label className="text-sm font-semibold">Opening Cash (₹)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={cash}
            onChange={(e) => setCash(e.target.value)}
            placeholder="Enter cash amount"
            className="w-full border rounded-xl p-3 mt-2"
          />
        </div>

        <div>
          <label className="text-sm font-semibold">Opening UPI (₹)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={upi}
            onChange={(e) => setUpi(e.target.value)}
            placeholder="Enter UPI amount"
            className="w-full border rounded-xl p-3 mt-2"
          />
        </div>

        <div className="bg-[#eaf2ed] rounded-xl p-4">
          <div className="flex items-center gap-2 text-[#173F35] text-sm">
            <Wallet size={18} />
            Total Opening Balance
          </div>
          <h3 className="text-2xl font-bold text-[#173F35] mt-2">
            ₹{total.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </h3>
        </div>

        {message && (
          <p className={`text-sm ${message.includes("successfully") ? "text-green-700" : "text-red-600"}`}>
            {message}
          </p>
        )}

        <button
          disabled={loading}
          className="w-full bg-[#173F35] text-white rounded-xl p-3 font-semibold flex justify-center items-center gap-2 disabled:opacity-60"
        >
          <Save size={18} />
          {loading ? "Saving..." : "Save Opening Balance"}
        </button>
      </form>
    </main>
  );
}