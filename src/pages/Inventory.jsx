
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  Package,
  Plus,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
  RefreshCw,
  Boxes,
} from "lucide-react";

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const units = [
  "kg", "g", "litre", "ml", "piece",
  "packet", "dozen", "box", "bottle",
];

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("stock");
  const [movementType, setMovementType] = useState("stock_in");

  const [itemForm, setItemForm] = useState({
    item_name: "",
    unit: "kg",
    current_quantity: "",
    minimum_quantity: "",
  });

  const [movementForm, setMovementForm] = useState({
    item_id: "",
    quantity: "",
    movement_date: today(),
    notes: "",
  });

  async function loadInventory() {
    setLoading(true);
    setError("");

    const [itemsResult, movementsResult] = await Promise.all([
      supabase
        .from("inventory_items")
        .select("*")
        .order("item_name"),

      supabase
        .from("inventory_movements")
        .select("*, inventory_items(item_name, unit)")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    if (itemsResult.error || movementsResult.error) {
      setError(itemsResult.error?.message || movementsResult.error?.message);
    } else {
      setItems(itemsResult.data || []);
      setMovements(movementsResult.data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadInventory();
  }, []);

  async function addItem(e) {
    e.preventDefault();

    const quantity = Number(itemForm.current_quantity);
    const minimum = Number(itemForm.minimum_quantity);

    if (
      !itemForm.item_name.trim() ||
      !Number.isFinite(quantity) ||
      !Number.isFinite(minimum) ||
      quantity < 0 ||
      minimum < 0
    ) {
      alert("Please enter valid inventory details.");
      return;
    }

    setSaving(true);

    const { data: newItem, error: insertError } = await supabase
      .from("inventory_items")
      .insert({
        item_name: itemForm.item_name.trim(),
        unit: itemForm.unit,
        current_quantity: quantity,
        minimum_quantity: minimum,
      })
      .select()
      .single();

    if (insertError) {
      setSaving(false);
      alert(insertError.message);
      return;
    }

    // Record the initial quantity as opening stock.
    if (quantity > 0) {
      const { error: movementError } = await supabase
        .from("inventory_movements")
        .insert({
          item_id: newItem.id,
          movement_type: "stock_in",
          quantity,
          movement_date: today(),
          notes: "Initial stock",
        });

      if (movementError) {
        alert(
          "Item created, but initial stock history could not be saved: " +
          movementError.message
        );
      }
    }

    setItemForm({
      item_name: "",
      unit: "kg",
      current_quantity: "",
      minimum_quantity: "",
    });

    setSaving(false);
    setActiveTab("stock");
    loadInventory();
  }

  async function recordMovement(e) {
    e.preventDefault();

    const item = items.find((x) => x.id === movementForm.item_id);
    const quantity = Number(movementForm.quantity);

    if (!item || !Number.isFinite(quantity) || quantity <= 0) {
      alert("Select an item and enter a valid quantity.");
      return;
    }

    const current = Number(item.current_quantity);

    if (movementType === "stock_out" && quantity > current) {
      alert(`Available stock is only ${current} ${item.unit}.`);
      return;
    }

    const newQuantity =
      movementType === "stock_in"
        ? current + quantity
        : current - quantity;

    setSaving(true);

    // Update stock quantity.
    const { data: updatedItem, error: updateError } = await supabase
      .from("inventory_items")
      .update({ current_quantity: newQuantity })
      .eq("id", item.id)
      .eq("current_quantity", current)
      .select("id")
      .maybeSingle();

    if (updateError || !updatedItem) {
      setSaving(false);
      alert(
        updateError?.message ||
        "Stock changed while saving. Refresh and try again."
      );
      loadInventory();
      return;
    }

    // Save movement history.
    const { error: movementError } = await supabase
      .from("inventory_movements")
      .insert({
        item_id: item.id,
        movement_type: movementType,
        quantity,
        movement_date: movementForm.movement_date,
        notes: movementForm.notes.trim() || null,
      });

    if (movementError) {
      // Roll back the quantity if history could not be saved.
      await supabase
        .from("inventory_items")
        .update({ current_quantity: current })
        .eq("id", item.id)
        .eq("current_quantity", newQuantity);

      setSaving(false);
      alert("Could not save movement: " + movementError.message);
      loadInventory();
      return;
    }

    setMovementForm({
      item_id: "",
      quantity: "",
      movement_date: today(),
      notes: "",
    });

    setSaving(false);
    alert(movementType === "stock_in" ? "Stock added successfully!" : "Stock usage recorded!");
    loadInventory();
  }

  const lowStockItems = items.filter(
    (item) =>
      Number(item.current_quantity) <= Number(item.minimum_quantity)
  );

  const totalItems = items.length;

  function formatQuantity(value) {
    return Number(value || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 3,
    });
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 pb-28">

      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage cafe raw materials and stock
          </p>
        </div>

        <button
          onClick={loadInventory}
          className="p-3 bg-white rounded-xl border border-gray-200"
          aria-label="Refresh inventory"
        >
          <RefreshCw size={19} />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Overview */}
      <section className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-[#173F35] text-white rounded-2xl p-5">
          <Boxes size={23} className="text-green-200" />
          <p className="text-sm text-green-200 mt-3">Total Materials</p>
          <h3 className="text-3xl font-bold mt-1">{totalItems}</h3>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <AlertTriangle size={23} className="text-orange-500" />
          <p className="text-sm text-gray-500 mt-3">Low Stock Items</p>
          <h3 className="text-3xl font-bold mt-1 text-orange-600">
            {lowStockItems.length}
          </h3>
        </div>
      </section>

      {/* Low stock alerts */}
      {lowStockItems.length > 0 && (
        <section className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-5">
          <div className="flex items-center gap-2 text-orange-800 font-bold mb-3">
            <AlertTriangle size={19} />
            Low Stock Alert
          </div>

          {lowStockItems.map((item) => (
            <div
              key={item.id}
              className="flex justify-between text-sm py-2 border-t border-orange-200"
            >
              <span className="font-medium text-orange-900">
                {item.item_name}
              </span>
              <span className="text-orange-800">
                {formatQuantity(item.current_quantity)} {item.unit} left
              </span>
            </div>
          ))}
        </section>
      )}

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[
          ["stock", "Stock"],
          ["add", "Add Item"],
          ["movement", "Stock Entry"],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            className={`py-3 rounded-xl text-sm font-semibold ${
              activeTab === value
                ? "bg-[#173F35] text-white"
                : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-500">
          Loading inventory...
        </div>
      ) : (
        <>
          {/* Stock list */}
          {activeTab === "stock" && (
            <section className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-bold mb-4">Current Stock</h3>

              {items.length === 0 ? (
                <div className="text-center py-10">
                  <Package size={35} className="mx-auto text-gray-300" />
                  <p className="text-gray-500 mt-3">No inventory items yet.</p>
                  <button
                    onClick={() => setActiveTab("add")}
                    className="mt-4 bg-[#173F35] text-white px-5 py-3 rounded-xl text-sm"
                  >
                    Add First Item
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {items.map((item) => {
                    const isLow =
                      Number(item.current_quantity) <=
                      Number(item.minimum_quantity);

                    return (
                      <div
                        key={item.id}
                        className="py-4 flex justify-between items-center gap-3"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900">
                            {item.item_name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Minimum: {formatQuantity(item.minimum_quantity)} {item.unit}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="font-bold text-lg">
                            {formatQuantity(item.current_quantity)} {item.unit}
                          </p>
                          <span className={`text-xs font-semibold ${
                            isLow ? "text-orange-600" : "text-green-700"
                          }`}>
                            {isLow ? "Low Stock" : "In Stock"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Add item form */}
          {activeTab === "add" && (
            <section className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-bold mb-5">Add New Material</h3>

              <form onSubmit={addItem} className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Material Name
                  </label>
                  <input
                    required
                    value={itemForm.item_name}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, item_name: e.target.value })
                    }
                    placeholder="e.g. Milk, Coffee, Sugar"
                    className="w-full border rounded-xl p-3"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">
                    Unit
                  </label>
                  <select
                    value={itemForm.unit}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, unit: e.target.value })
                    }
                    className="w-full border rounded-xl p-3 bg-white"
                  >
                    {units.map((unit) => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">
                    Initial Stock
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.001"
                    value={itemForm.current_quantity}
                    onChange={(e) =>
                      setItemForm({
                        ...itemForm,
                        current_quantity: e.target.value,
                      })
                    }
                    placeholder="Enter available quantity"
                    className="w-full border rounded-xl p-3"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">
                    Minimum Stock Alert
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.001"
                    value={itemForm.minimum_quantity}
                    onChange={(e) =>
                      setItemForm({
                        ...itemForm,
                        minimum_quantity: e.target.value,
                      })
                    }
                    placeholder="e.g. 2"
                    className="w-full border rounded-xl p-3"
                  />
                </div>

                <button
                  disabled={saving}
                  className="w-full bg-[#173F35] text-white rounded-xl py-3 font-semibold disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Add Inventory Item"}
                </button>
              </form>
            </section>
          )}

          {/* Stock movement form */}
          {activeTab === "movement" && (
            <section className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-bold mb-5">Record Stock Movement</h3>

              <div className="grid grid-cols-2 gap-2 mb-5">
                <button
                  onClick={() => setMovementType("stock_in")}
                  className={`p-3 rounded-xl flex justify-center items-center gap-2 text-sm font-semibold ${
                    movementType === "stock_in"
                      ? "bg-green-700 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  <ArrowDownToLine size={18} />
                  Stock In
                </button>

                <button
                  onClick={() => setMovementType("stock_out")}
                  className={`p-3 rounded-xl flex justify-center items-center gap-2 text-sm font-semibold ${
                    movementType === "stock_out"
                      ? "bg-red-600 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  <ArrowUpFromLine size={18} />
                  Stock Out
                </button>
              </div>

              <form onSubmit={recordMovement} className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Select Material
                  </label>
                  <select
                    required
                    value={movementForm.item_id}
                    onChange={(e) =>
                      setMovementForm({
                        ...movementForm,
                        item_id: e.target.value,
                      })
                    }
                    className="w-full border rounded-xl p-3 bg-white"
                  >
                    <option value="">Choose material</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.item_name} — {formatQuantity(item.current_quantity)} {item.unit}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">
                    Quantity
                  </label>
                  <input
                    required
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={movementForm.quantity}
                    onChange={(e) =>
                      setMovementForm({
                        ...movementForm,
                        quantity: e.target.value,
                      })
                    }
                    placeholder="Enter quantity"
                    className="w-full border rounded-xl p-3"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={movementForm.movement_date}
                    onChange={(e) =>
                      setMovementForm({
                        ...movementForm,
                        movement_date: e.target.value,
                      })
                    }
                    className="w-full border rounded-xl p-3"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">
                    Notes (Optional)
                  </label>
                  <input
                    value={movementForm.notes}
                    onChange={(e) =>
                      setMovementForm({
                        ...movementForm,
                        notes: e.target.value,
                      })
                    }
                    placeholder="e.g. Morning stock usage"
                    className="w-full border rounded-xl p-3"
                  />
                </div>

                <button
                  disabled={saving || items.length === 0}
                  className={`w-full text-white rounded-xl py-3 font-semibold disabled:opacity-50 ${
                    movementType === "stock_in"
                      ? "bg-green-700"
                      : "bg-red-600"
                  }`}
                >
                  {saving
                    ? "Saving..."
                    : movementType === "stock_in"
                    ? "Add Stock"
                    : "Record Stock Usage"}
                </button>
              </form>
            </section>
          )}

          {/* Recent movements */}
          <section className="bg-white rounded-2xl border border-gray-100 p-5 mt-5">
            <h3 className="font-bold mb-4">Recent Stock History</h3>

            {movements.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-5">
                No stock movements recorded.
              </p>
            ) : (
              <div className="space-y-4">
                {movements.map((movement) => (
                  <div
                    key={movement.id}
                    className="flex justify-between items-center border-b border-gray-100 pb-3 gap-3"
                  >
                    <div>
                      <p className="font-semibold text-sm">
                        {movement.inventory_items?.item_name || "Material"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {movement.movement_date}
                        {movement.notes ? ` · ${movement.notes}` : ""}
                      </p>
                    </div>

                    <strong className={`text-sm shrink-0 ${
                      movement.movement_type === "stock_in"
                        ? "text-green-700"
                        : "text-red-600"
                    }`}>
                      {movement.movement_type === "stock_in" ? "+" : "-"}
                      {formatQuantity(movement.quantity)}
                      {" "}
                      {movement.inventory_items?.unit || ""}
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
