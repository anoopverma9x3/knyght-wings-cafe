
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  Save,
  ShoppingBag,
  Tag,
  Pencil,
  Trash2,
  X,
  RefreshCw,
} from "lucide-react";

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

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchSales();
  }, []);

  async function fetchSales() {
    setListLoading(true);

    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .order("sale_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      setMessage(error.message);
      setSuccess(false);
    } else {
      setSales(data || []);
    }

    setListLoading(false);
  }

  function resetForm() {
    setDate(getToday());
    setProductName("");
    setAmount("");
    setPayment("cash");
    setNotes("");
    setEditingId(null);
  }

  function handleEdit(sale) {
    if (sale.payment_method === "credit" && sale.credit_settled) {
      setMessage(
        "This credit sale is already settled. Undo its settlement from the Credit page before editing."
      );
      setSuccess(false);
      return;
    }

    setEditingId(sale.id);
    setDate(sale.sale_date);
    setProductName(sale.product_name || "");
    setAmount(String(sale.amount));
    setPayment(sale.payment_method);
    setNotes(sale.notes || "");
    setMessage("");
    setSuccess(false);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setSuccess(false);

    const saleData = {
      sale_date: date,
      product_name: productName.trim() || null,
      amount: Number(amount),
      payment_method: payment,
      notes: notes.trim() || null,
    };

    let error;

    if (editingId) {
      const result = await supabase
        .from("sales")
        .update(saleData)
        .eq("id", editingId);

      error = result.error;
    } else {
      const result = await supabase
        .from("sales")
        .insert(saleData);

      error = result.error;
    }

    if (error) {
      setMessage(error.message);
      setSuccess(false);
    } else {
      setMessage(
        editingId
          ? "Sale updated successfully!"
          : "Sale recorded successfully!"
      );
      setSuccess(true);

      resetForm();
      await fetchSales();
    }

    setLoading(false);
  }

  async function handleDelete(sale) {
    if (sale.payment_method === "credit" && sale.credit_settled) {
      setMessage(
        "This credit sale is already settled. Undo its settlement from the Credit page before deleting it."
      );
      setSuccess(false);
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete this sale?\n\n${sale.product_name || "Sale"} - ₹${Number(sale.amount).toFixed(2)}\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(sale.id);
    setMessage("");

    const { error } = await supabase
      .from("sales")
      .delete()
      .eq("id", sale.id);

    if (error) {
      setMessage(error.message);
      setSuccess(false);
    } else {
      setMessage("Sale permanently deleted.");
      setSuccess(true);

      if (editingId === sale.id) {
        resetForm();
      }

      await fetchSales();
    }

    setDeletingId(null);
  }

  const formatDate = (value) =>
    new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <main className="max-w-2xl mx-auto p-4 md:p-6 pb-28">
      {/* Page heading */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-[#173F35] text-white p-3 rounded-xl">
            <ShoppingBag size={23} />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {editingId ? "Edit Sale" : "Add Sale"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Record and manage cafe sales.
            </p>
          </div>
        </div>
      </div>

      {/* Sale form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl p-5 shadow-sm space-y-5"
      >
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

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#173F35] hover:bg-[#205747] text-white rounded-xl p-3.5 font-semibold flex justify-center items-center gap-2 disabled:opacity-60"
        >
          <Save size={18} />
          {loading
            ? "Saving..."
            : editingId
              ? "Update Sale"
              : "Save Sale"}
        </button>

        {editingId && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setMessage("");
            }}
            className="w-full border border-gray-200 text-gray-600 rounded-xl p-3 font-semibold flex items-center justify-center gap-2"
          >
            <X size={18} />
            Cancel Editing
          </button>
        )}
      </form>

      {/* Recent sales list */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Recent Sales
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Manage your last 50 sales.
            </p>
          </div>

          <button
            onClick={fetchSales}
            disabled={listLoading}
            className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-600"
            aria-label="Refresh sales"
          >
            <RefreshCw
              size={18}
              className={listLoading ? "animate-spin" : ""}
            />
          </button>
        </div>

        {listLoading ? (
          <div className="bg-white rounded-xl p-6 text-center text-gray-500">
            Loading sales...
          </div>
        ) : sales.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center text-gray-500">
            No sales recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {sales.map((sale) => {
              const settled =
                sale.payment_method === "credit" &&
                sale.credit_settled;

              return (
                <div
                  key={sale.id}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
                >
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {sale.product_name || "Sale"}
                      </h4>

                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(sale.sale_date)}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-xs capitalize bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                          {sale.payment_method}
                        </span>

                        {settled && (
                          <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-lg">
                            Settled
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-bold text-gray-900">
                        ₹{Number(sale.amount).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>

                      <div className="flex items-center justify-end gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() => handleEdit(sale)}
                          disabled={settled}
                          title={
                            settled
                              ? "Undo settlement first"
                              : "Edit sale"
                          }
                          className="p-2 rounded-lg bg-blue-50 text-blue-700 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(sale)}
                          disabled={settled || deletingId === sale.id}
                          title={
                            settled
                              ? "Undo settlement first"
                              : "Permanently delete sale"
                          }
                          className="p-2 rounded-lg bg-red-50 text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          {deletingId === sale.id ? (
                            <RefreshCw size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {settled && (
                    <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2 mt-3">
                      Undo this credit settlement from the Credit page
                      before editing or deleting this sale.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
