
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  ShoppingCart,
  Package,
  IndianRupee,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RefreshCw,
} from "lucide-react";

const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const units = [
  "kg", "g", "litre", "ml", "piece",
  "packet", "dozen", "box", "bottle",
];

const inputClass =
  "w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#173F35] focus:ring-2 focus:ring-[#173F35]/10 bg-white";

export default function Purchases() {
  const [purchaseDate, setPurchaseDate] = useState(today());
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("kg");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const [inventoryItemId, setInventoryItemId] = useState("");
  const [inventoryItems, setInventoryItems] = useState([]);

  const [purchases, setPurchases] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingPurchases, setLoadingPurchases] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchInventoryItems();
    fetchPurchases();
  }, []);

  async function fetchInventoryItems() {
    setLoadingItems(true);

    const { data, error } = await supabase
      .from("inventory_items")
      .select("id, item_name, unit, current_quantity")
      .order("item_name");

    if (error) {
      console.error(error);
      setErrorMessage("Could not load inventory items.");
    } else {
      setInventoryItems(data || []);
    }

    setLoadingItems(false);
  }

  async function fetchPurchases() {
    setLoadingPurchases(true);

    const { data, error } = await supabase
      .from("purchases")
      .select("*")
      .order("purchase_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error(error);
      setErrorMessage(error.message || "Could not load purchases.");
    } else {
      setPurchases(data || []);
    }

    setLoadingPurchases(false);
  }

  function handleInventoryChange(id) {
    setInventoryItemId(id);

    if (!id) return;

    const selectedItem = inventoryItems.find(
      (item) => item.id === id
    );

    if (selectedItem) {
      setItemName(selectedItem.item_name);
      setUnit(selectedItem.unit);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setMessage("");
    setErrorMessage("");

    const numericQuantity = Number(quantity);
    const numericAmount = Number(amount);

    if (!purchaseDate || !itemName.trim()) {
      setErrorMessage("Please enter the date and item name.");
      return;
    }

    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
      setErrorMessage("Enter a valid quantity greater than zero.");
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setErrorMessage("Enter a valid amount greater than zero.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc(
      "record_purchase_with_inventory",
      {
        p_purchase_date: purchaseDate,
        p_item_name: itemName.trim(),
        p_quantity: numericQuantity,
        p_unit: unit,
        p_amount: numericAmount,
        p_payment_method: paymentMethod,
        p_inventory_item_id: inventoryItemId || null,
      }
    );

    setSaving(false);

    if (error) {
      console.error(error);
      setErrorMessage(error.message || "Could not save purchase.");
      return;
    }

    setMessage(
      inventoryItemId
        ? "Purchase saved and inventory stock updated successfully!"
        : "Purchase saved successfully!"
    );

    setPurchaseDate(today());
    setItemName("");
    setQuantity("");
    setUnit("kg");
    setAmount("");
    setPaymentMethod("cash");
    setInventoryItemId("");

    await Promise.all([
      fetchInventoryItems(),
      fetchPurchases(),
    ]);
  }

  async function handleDelete(purchase) {
    if (
      purchase.payment_method === "credit" &&
      purchase.credit_settled
    ) {
      setErrorMessage(
        "Undo supplier settlement from the Credit page before deleting this purchase."
      );
      setMessage("");
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete this purchase?\n\n${purchase.item_name}\nQuantity: ${purchase.quantity} ${purchase.unit}\nAmount: ₹${Number(purchase.amount).toFixed(2)}\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(purchase.id);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "delete_purchase_with_inventory",
      {
        p_purchase_id: purchase.id,
      }
    );

    if (error) {
      console.error("Purchase deletion error:", error);
      setErrorMessage(
        error.message || "Could not delete purchase."
      );
    } else {
      setMessage(
        "Purchase permanently deleted successfully."
      );

      await Promise.all([
        fetchPurchases(),
        fetchInventoryItems(),
      ]);
    }

    setDeletingId(null);
  }

  function formatDate(value) {
    return new Date(`${value}T00:00:00`).toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pt-5 pb-28">
      {/* Heading */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-[#173F35] text-white p-3 rounded-xl">
            <ShoppingCart size={23} />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Add Purchase
            </h2>
            <p className="text-sm text-gray-500">
              Record raw material and stock purchases
            </p>
          </div>
        </div>
      </div>

      {/* Purchase Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-5"
      >
        {/* Purchase date */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Purchase Date
          </label>

          <div className="relative">
            <CalendarDays
              size={18}
              className="absolute left-3 top-3.5 text-gray-400"
            />

            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className={`${inputClass} pl-10`}
              required
            />
          </div>
        </div>

        {/* Inventory selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Link to Inventory (Optional)
          </label>

          <div className="relative">
            <Package
              size={18}
              className="absolute left-3 top-3.5 text-gray-400"
            />

            <select
              value={inventoryItemId}
              onChange={(e) =>
                handleInventoryChange(e.target.value)
              }
              className={`${inputClass} pl-10`}
            >
              <option value="">
                {loadingItems
                  ? "Loading inventory..."
                  : "Select inventory item or add manually"}
              </option>

              {inventoryItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.item_name} — Stock: {item.current_quantity}{" "}
                  {item.unit}
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-gray-400 mt-2">
            Select an item to automatically increase its stock after
            saving the purchase.
          </p>
        </div>

        {/* Item name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Item Name
          </label>

          <input
            type="text"
            value={itemName}
            onChange={(e) => {
              setItemName(e.target.value);
              setInventoryItemId("");
            }}
            placeholder="e.g. Milk, Coffee, Sugar"
            className={inputClass}
            required
          />
        </div>

        {/* Quantity and unit */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Quantity
            </label>

            <input
              type="number"
              min="0.001"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 5"
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Unit
            </label>

            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className={inputClass}
              required
            >
              {units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Total Purchase Amount
          </label>

          <div className="relative">
            <IndianRupee
              size={18}
              className="absolute left-3 top-3.5 text-gray-400"
            />

            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter total amount"
              className={`${inputClass} pl-10`}
              required
            />
          </div>
        </div>

        {/* Payment method */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Payment Method
          </label>

          <div className="grid grid-cols-3 gap-2">
            {["cash", "upi", "credit"].map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={`py-3 rounded-xl border text-sm font-semibold capitalize transition ${
                  paymentMethod === method
                    ? "bg-[#173F35] text-white border-[#173F35]"
                    : "bg-white text-gray-600 border-gray-200"
                }`}
              >
                {method}
              </button>
            ))}
          </div>

          {paymentMethod === "credit" && (
            <p className="text-xs text-orange-600 mt-2">
              This purchase will be recorded as an amount payable to
              the supplier. It will not reduce your cash or UPI
              balance until settled.
            </p>
          )}
        </div>

        {/* Success message */}
        {message && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-green-50 text-green-700 text-sm">
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
            <span>{message}</span>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={saving || loadingItems}
          className="w-full bg-[#173F35] hover:bg-[#205747] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition"
        >
          {saving ? "Saving Purchase..." : "Save Purchase"}
        </button>
      </form>

      {/* Recent Purchases */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-800">
              Recent Purchases
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Manage your last 50 purchase records.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              Promise.all([fetchPurchases(), fetchInventoryItems()])
            }
            disabled={loadingPurchases}
            className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-600"
            aria-label="Refresh purchases"
          >
            <RefreshCw
              size={18}
              className={loadingPurchases ? "animate-spin" : ""}
            />
          </button>
        </div>

        {loadingPurchases ? (
          <div className="bg-white rounded-xl p-6 text-center text-gray-500">
            Loading purchases...
          </div>
        ) : purchases.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center text-gray-500">
            No purchases recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {purchases.map((purchase) => {
              const settled =
                purchase.payment_method === "credit" &&
                purchase.credit_settled;

              return (
                <div
                  key={purchase.id}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="font-semibold text-gray-900">
                        {purchase.item_name}
                      </h4>

                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(purchase.purchase_date)}
                      </p>

                      <p className="text-sm text-gray-600 mt-2">
                        {purchase.quantity} {purchase.unit}
                      </p>

                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-xs capitalize bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                          {purchase.payment_method}
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
                        ₹{Number(purchase.amount).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>

                      <button
                        type="button"
                        onClick={() => handleDelete(purchase)}
                        disabled={
                          settled || deletingId === purchase.id
                        }
                        title={
                          settled
                            ? "Undo supplier settlement first"
                            : "Permanently delete purchase"
                        }
                        className="mt-3 p-2.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {deletingId === purchase.id ? (
                          <RefreshCw
                            size={17}
                            className="animate-spin"
                          />
                        ) : (
                          <Trash2 size={17} />
                        )}
                      </button>
                    </div>
                  </div>

                  {settled && (
                    <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2 mt-3">
                      Undo supplier settlement from the Credit page
                      before deleting this purchase.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
