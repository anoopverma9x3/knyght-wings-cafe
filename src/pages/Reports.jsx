
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  TrendingUp,
  ShoppingBag,
  Receipt,
  CreditCard,
  RefreshCw,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  Tag,
  Package,
  Download,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const money = (value) =>
  "Rs. " +
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function getDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRange(period) {
  const end = new Date();
  const start = new Date();

  if (period === "weekly") {
    const day = start.getDay();
    const difference = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - difference);
  } else if (period === "monthly") {
    start.setDate(1);
  }

  return {
    start: getDateString(start),
    end: getDateString(end),
  };
}

const sum = (items) =>
  items.reduce(
    (total, item) => total + Number(item.amount || 0),
    0
  );

const totalByMethod = (items, method) =>
  sum(items.filter((item) => item.payment_method === method));

const totalBySettlement = (items, method) =>
  sum(items.filter((item) => item.settlement_method === method));

export default function Reports() {
  const [period, setPeriod] = useState("daily");

  const [report, setReport] = useState({
    sales: [],
    purchases: [],
    expenses: [],
    settledSales: [],
    settledPurchases: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  const range = getRange(period);

  async function loadReport() {
    setLoading(true);
    setError("");

    const results = await Promise.all([
      supabase
        .from("sales")
        .select("*")
        .gte("sale_date", range.start)
        .lte("sale_date", range.end),

      supabase
        .from("purchases")
        .select("*")
        .gte("purchase_date", range.start)
        .lte("purchase_date", range.end),

      supabase
        .from("expenses")
        .select("*")
        .gte("expense_date", range.start)
        .lte("expense_date", range.end),

      supabase
        .from("sales")
        .select("*")
        .eq("credit_settled", true)
        .gte("settled_at", range.start)
        .lte("settled_at", range.end),

      supabase
        .from("purchases")
        .select("*")
        .eq("credit_settled", true)
        .gte("settled_at", range.start)
        .lte("settled_at", range.end),
    ]);

    const failed = results.find((result) => result.error);

    if (failed) {
      setError(failed.error.message);
    } else {
      setReport({
        sales: results[0].data || [],
        purchases: results[1].data || [],
        expenses: results[2].data || [],
        settledSales: results[3].data || [],
        settledPurchases: results[4].data || [],
      });
    }

    setLoading(false);
  }

  useEffect(() => {
    loadReport();
  }, [period]);

  const totalSales = sum(report.sales);
  const totalPurchases = sum(report.purchases);
  const totalExpenses = sum(report.expenses);

  const cashSales = totalByMethod(report.sales, "cash");
  const upiSales = totalByMethod(report.sales, "upi");
  const creditSales = totalByMethod(report.sales, "credit");

  const cashPurchases = totalByMethod(report.purchases, "cash");
  const upiPurchases = totalByMethod(report.purchases, "upi");
  const creditPurchases = totalByMethod(report.purchases, "credit");

  const cashExpenses = totalByMethod(report.expenses, "cash");
  const upiExpenses = totalByMethod(report.expenses, "upi");

  const creditReceived = sum(report.settledSales);
  const supplierPayments = sum(report.settledPurchases);

  const cashCreditReceived = totalBySettlement(
    report.settledSales,
    "cash"
  );

  const upiCreditReceived = totalBySettlement(
    report.settledSales,
    "upi"
  );

  const cashSupplierPayments = totalBySettlement(
    report.settledPurchases,
    "cash"
  );

  const upiSupplierPayments = totalBySettlement(
    report.settledPurchases,
    "upi"
  );

  const cashMovement =
    cashSales +
    cashCreditReceived -
    cashPurchases -
    cashSupplierPayments -
    cashExpenses;

  const upiMovement =
    upiSales +
    upiCreditReceived -
    upiPurchases -
    upiSupplierPayments -
    upiExpenses;

  const transactionsCount =
    report.sales.length +
    report.purchases.length +
    report.expenses.length;

  const periodLabel = {
    daily: "Today",
    weekly: "This Week",
    monthly: "This Month",
  };

  // Group sales by product name.
  const productSales = Object.values(
    report.sales.reduce((groups, sale) => {
      const name = sale.product_name?.trim() || "Unnamed Sale";

      if (!groups[name]) {
        groups[name] = {
          name,
          count: 0,
          total: 0,
          cash: 0,
          upi: 0,
          credit: 0,
        };
      }

      groups[name].count += 1;
      groups[name].total += Number(sale.amount || 0);

      if (sale.payment_method === "cash") {
        groups[name].cash += Number(sale.amount || 0);
      } else if (sale.payment_method === "upi") {
        groups[name].upi += Number(sale.amount || 0);
      } else if (sale.payment_method === "credit") {
        groups[name].credit += Number(sale.amount || 0);
      }

      return groups;
    }, {})
  ).sort((a, b) => b.total - a.total);

  // Generate downloadable PDF.
  function downloadPDF() {
    try {
      setDownloading(true);

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      const green = [23, 63, 53];
      const lightGreen = [235, 245, 239];
      const gray = [100, 116, 110];

      let y = 20;

      // Header
      doc.setFillColor(...green);
      doc.rect(0, 0, pageWidth, 42, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(21);
      doc.text("Knyght Wings Cafe", 14, 19);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Business Performance Report", 14, 27);
      doc.text(
        `${periodLabel[period]} | ${range.start} to ${range.end}`,
        14,
        34
      );

      y = 52;

      // Summary cards as a table
      doc.setTextColor(...green);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Financial Overview", 14, y);

      y += 5;

      autoTable(doc, {
        startY: y,
        head: [["Metric", "Amount"]],
        body: [
          ["Total Sales", money(totalSales)],
          ["Total Purchases", money(totalPurchases)],
          ["Total Expenses", money(totalExpenses)],
          ["Credit Sales", money(creditSales)],
          ["Total Transactions", String(transactionsCount)],
        ],
        theme: "grid",
        headStyles: {
          fillColor: green,
          textColor: 255,
        },
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        alternateRowStyles: {
          fillColor: lightGreen,
        },
      });

      y = doc.lastAutoTable.finalY + 12;

      // Sales by product
      if (y > 245) {
        doc.addPage();
        y = 20;
      }

      doc.setTextColor(...green);
      doc.setFontSize(14);
      doc.text("Sales by Product", 14, y);

      autoTable(doc, {
        startY: y + 5,
        head: [[
          "Product",
          "Transactions",
          "Cash",
          "UPI",
          "Credit",
          "Total",
        ]],
        body: productSales.length
          ? productSales.map((item) => [
              item.name,
              String(item.count),
              money(item.cash),
              money(item.upi),
              money(item.credit),
              money(item.total),
            ])
          : [["No sales recorded", "-", "-", "-", "-", "-"]],
        theme: "grid",
        headStyles: {
          fillColor: green,
          textColor: 255,
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 2.5,
          overflow: "linebreak",
        },
        alternateRowStyles: {
          fillColor: lightGreen,
        },
      });

      y = doc.lastAutoTable.finalY + 12;

      // Payment breakdown
      if (y > 245) {
        doc.addPage();
        y = 20;
      }

      doc.setTextColor(...green);
      doc.setFontSize(14);
      doc.text("Sales & Payment Breakdown", 14, y);

      autoTable(doc, {
        startY: y + 5,
        head: [["Payment Type", "Amount"]],
        body: [
          ["Cash Sales", money(cashSales)],
          ["UPI Sales", money(upiSales)],
          ["Credit Sales", money(creditSales)],
          ["Total Sales", money(totalSales)],
        ],
        theme: "grid",
        headStyles: {
          fillColor: green,
          textColor: 255,
        },
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
      });

      y = doc.lastAutoTable.finalY + 12;

      // Credit settlements
      if (y > 245) {
        doc.addPage();
        y = 20;
      }

      doc.setTextColor(...green);
      doc.setFontSize(14);
      doc.text("Credit Settlements", 14, y);

      autoTable(doc, {
        startY: y + 5,
        head: [["Settlement", "Cash", "UPI", "Total"]],
        body: [
          [
            "Customer Payments Received",
            money(cashCreditReceived),
            money(upiCreditReceived),
            money(creditReceived),
          ],
          [
            "Supplier Payments Made",
            money(cashSupplierPayments),
            money(upiSupplierPayments),
            money(supplierPayments),
          ],
        ],
        theme: "grid",
        headStyles: {
          fillColor: green,
          textColor: 255,
        },
        styles: {
          fontSize: 8,
          cellPadding: 3,
        },
      });

      y = doc.lastAutoTable.finalY + 12;

      // Cash and UPI movement
      if (y > 245) {
        doc.addPage();
        y = 20;
      }

      doc.setTextColor(...green);
      doc.setFontSize(14);
      doc.text("Cash & UPI Movement", 14, y);

      autoTable(doc, {
        startY: y + 5,
        head: [["Description", "Amount"]],
        body: [
          ["Cash Sales", money(cashSales)],
          ["Cash Credit Received", money(cashCreditReceived)],
          ["Cash Purchases", money(cashPurchases)],
          ["Cash Supplier Payments", money(cashSupplierPayments)],
          ["Cash Expenses", money(cashExpenses)],
          ["Net Cash Movement", money(cashMovement)],
          ["UPI Sales", money(upiSales)],
          ["UPI Credit Received", money(upiCreditReceived)],
          ["UPI Purchases", money(upiPurchases)],
          ["UPI Supplier Payments", money(upiSupplierPayments)],
          ["UPI Expenses", money(upiExpenses)],
          ["Net UPI Movement", money(upiMovement)],
        ],
        theme: "grid",
        headStyles: {
          fillColor: green,
          textColor: 255,
        },
        styles: {
          fontSize: 8.5,
          cellPadding: 2.5,
        },
        alternateRowStyles: {
          fillColor: lightGreen,
        },
      });

      y = doc.lastAutoTable.finalY + 12;

      // Expense breakdown
      if (y > 245) {
        doc.addPage();
        y = 20;
      }

      doc.setTextColor(...green);
      doc.setFontSize(14);
      doc.text("Expense Breakdown", 14, y);

      const expenseGroups = Object.entries(
        report.expenses.reduce((groups, expense) => {
          const category = expense.category || "Other";
          groups[category] =
            (groups[category] || 0) + Number(expense.amount || 0);
          return groups;
        }, {})
      ).sort((a, b) => b[1] - a[1]);

      autoTable(doc, {
        startY: y + 5,
        head: [["Category", "Amount"]],
        body: expenseGroups.length
          ? expenseGroups.map(([category, amount]) => [
              category,
              money(amount),
            ])
          : [["No expenses recorded", "-"]],
        theme: "grid",
        headStyles: {
          fillColor: green,
          textColor: 255,
        },
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
      });

      // Transaction details
      doc.addPage();

      doc.setTextColor(...green);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("Transaction Details", 14, 20);

      const transactionRows = [
        ...report.sales.map((item) => [
          item.sale_date || "",
          "Sale",
          item.product_name || "Unnamed Sale",
          item.payment_method || "",
          money(item.amount),
        ]),
        ...report.purchases.map((item) => [
          item.purchase_date || "",
          "Purchase",
          item.item_name || "",
          item.payment_method || "",
          money(item.amount),
        ]),
        ...report.expenses.map((item) => [
          item.expense_date || "",
          "Expense",
          item.category || "",
          item.payment_method || "",
          money(item.amount),
        ]),
      ].sort((a, b) => String(a[0]).localeCompare(String(b[0])));

      autoTable(doc, {
        startY: 26,
        head: [[
          "Date",
          "Type",
          "Description",
          "Payment",
          "Amount",
        ]],
        body: transactionRows.length
          ? transactionRows
          : [["-", "-", "No transactions", "-", "-"]],
        theme: "grid",
        headStyles: {
          fillColor: green,
          textColor: 255,
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 2.5,
          overflow: "linebreak",
        },
        alternateRowStyles: {
          fillColor: lightGreen,
        },
        columnStyles: {
          2: { cellWidth: 55 },
        },
      });

      // Footer on every page
      const pageCount = doc.internal.getNumberOfPages();

      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        const pageHeight = doc.internal.pageSize.getHeight();

        doc.setDrawColor(210, 220, 214);
        doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...gray);

        doc.text(
          "Knyght Wings Cafe | Business Report",
          14,
          pageHeight - 9
        );

        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth - 14,
          pageHeight - 9,
          { align: "right" }
        );
      }

      const fileName = `Knyght-Wings-Cafe-${period}-Report-${range.start}.pdf`;

      doc.save(fileName);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Unable to generate PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 pb-28">
      {/* Header */}
      <div className="flex justify-between items-center gap-3 mb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Business Reports
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Track your cafe performance
          </p>
        </div>

        <button
          onClick={loadReport}
          disabled={loading}
          className="p-3 bg-white rounded-xl border border-gray-200 disabled:opacity-50"
          aria-label="Refresh report"
        >
          <RefreshCw
            size={19}
            className={loading ? "animate-spin" : ""}
          />
        </button>
      </div>

      {/* Period selection */}
      <section className="bg-white rounded-2xl p-4 border border-gray-100 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays size={19} className="text-[#173F35]" />
          <h3 className="font-semibold">Report Period</h3>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            ["daily", "Daily"],
            ["weekly", "Weekly"],
            ["monthly", "Monthly"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={`py-3 rounded-xl text-sm font-semibold ${
                period === value
                  ? "bg-[#173F35] text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-500 mt-3">
          {range.start} to {range.end}
        </p>
      </section>

      {/* Download PDF */}
      <button
        onClick={downloadPDF}
        disabled={loading || downloading}
        className="w-full flex items-center justify-center gap-3 bg-[#173F35] hover:bg-[#205747] disabled:opacity-50 text-white font-semibold rounded-xl py-4 mb-5 shadow-sm transition"
      >
        <Download size={20} />
        {downloading ? "Generating PDF..." : "Download PDF Report"}
      </button>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-5 text-sm">
          {error}
          <button onClick={loadReport} className="underline ml-2">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl p-10 text-center text-gray-500">
          Loading report...
        </div>
      ) : (
        <>
          {/* Main statistics */}
          <h3 className="font-bold text-lg mb-3">
            {periodLabel[period]} Overview
          </h3>

          <section className="grid grid-cols-2 gap-3">
            {[
              {
                title: "Total Sales",
                amount: totalSales,
                icon: TrendingUp,
                color: "text-green-700",
                bg: "bg-green-50",
              },
              {
                title: "Purchases",
                amount: totalPurchases,
                icon: ShoppingBag,
                color: "text-orange-600",
                bg: "bg-orange-50",
              },
              {
                title: "Expenses",
                amount: totalExpenses,
                icon: Receipt,
                color: "text-red-600",
                bg: "bg-red-50",
              },
              {
                title: "Credit Sales",
                amount: creditSales,
                icon: CreditCard,
                color: "text-blue-700",
                bg: "bg-blue-50",
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="bg-white rounded-2xl p-4 border border-gray-100"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.bg} ${item.color}`}
                  >
                    <Icon size={21} />
                  </div>

                  <p className="text-xs text-gray-500 mt-4">
                    {item.title}
                  </p>

                  <h3 className="text-lg font-bold mt-1">
                    {money(item.amount)}
                  </h3>
                </div>
              );
            })}
          </section>

          {/* Sales by Product */}
          <section className="bg-white rounded-2xl p-5 border border-gray-100 mt-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-800">
                  Sales by Product
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Product-wise revenue for {periodLabel[period].toLowerCase()}
                </p>
              </div>

              <div className="bg-green-50 text-[#173F35] p-3 rounded-xl">
                <Package size={21} />
              </div>
            </div>

            {productSales.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-7">
                No sales recorded in this period.
              </p>
            ) : (
              <div className="space-y-4">
                {productSales.map((product) => (
                  <div
                    key={product.name}
                    className="border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="bg-gray-50 p-2 rounded-lg text-[#173F35]">
                          <Tag size={17} />
                        </div>

                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 break-words">
                            {product.name}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {product.count} transaction
                            {product.count !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>

                      <strong className="text-[#173F35] shrink-0">
                        {money(product.total)}
                      </strong>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 ml-11 text-xs text-gray-500">
                      <span>Cash: {money(product.cash)}</span>
                      <span>UPI: {money(product.upi)}</span>
                      <span>Credit: {money(product.credit)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-gray-100 pt-4 mt-4 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-600">
                Total Product Sales
              </span>
              <strong className="text-[#173F35]">
                {money(
                  productSales.reduce(
                    (total, item) => total + item.total,
                    0
                  )
                )}
              </strong>
            </div>
          </section>

          {/* Payment breakdown */}
          <section className="bg-white rounded-2xl p-5 border border-gray-100 mt-5">
            <h3 className="font-bold mb-5">Sales Breakdown</h3>

            <div className="space-y-4 text-sm">
              <ReportRow
                label="Cash Sales"
                value={money(cashSales)}
                positive
              />

              <ReportRow
                label="UPI Sales"
                value={money(upiSales)}
                positive
              />

              <ReportRow
                label="Credit Sales"
                value={money(creditSales)}
              />

              <div className="border-t pt-4">
                <ReportRow
                  label="Total Sales"
                  value={money(totalSales)}
                  bold
                />
              </div>
            </div>
          </section>

          {/* Credit settlements */}
          <section className="bg-white rounded-2xl p-5 border border-gray-100 mt-4">
            <h3 className="font-bold mb-5">Credit Settlements</h3>

            <div className="space-y-4 text-sm">
              <ReportRow
                label="Customer Payments Received"
                value={money(creditReceived)}
                positive
              />

              <ReportRow
                label="Supplier Payments Made"
                value={money(supplierPayments)}
              />

              <ReportRow
                label="Credit Purchases"
                value={money(creditPurchases)}
              />
            </div>

            <p className="text-xs text-gray-400 mt-4">
              Settlements affect cash and UPI balances, not sales or purchase totals.
            </p>
          </section>

          {/* Cash and UPI */}
          <section className="bg-white rounded-2xl p-5 border border-gray-100 mt-4">
            <h3 className="font-bold mb-5">
              Cash & UPI Movement
            </h3>

            <div className="space-y-4 text-sm">
              <ReportRow
                label="Cash movement"
                value={money(cashMovement)}
                positive={cashMovement >= 0}
              />

              <ReportRow
                label="UPI movement"
                value={money(upiMovement)}
                positive={upiMovement >= 0}
              />

              <div className="border-t pt-4">
                <ReportRow
                  label="Total cash + UPI movement"
                  value={money(cashMovement + upiMovement)}
                  bold
                />
              </div>
            </div>
          </section>

          {/* Expense breakdown */}
          <section className="bg-white rounded-2xl p-5 border border-gray-100 mt-4">
            <h3 className="font-bold mb-4">
              Expense Breakdown
            </h3>

            {report.expenses.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-5">
                No expenses recorded.
              </p>
            ) : (
              <div className="space-y-4">
                {Object.entries(
                  report.expenses.reduce((groups, expense) => {
                    const category = expense.category || "Other";

                    groups[category] =
                      (groups[category] || 0) +
                      Number(expense.amount || 0);

                    return groups;
                  }, {})
                )
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, amount]) => (
                    <ReportRow
                      key={category}
                      label={category}
                      value={money(amount)}
                    />
                  ))}
              </div>
            )}
          </section>

          {/* Transaction count */}
          <section className="bg-[#173F35] text-white rounded-2xl p-5 mt-5">
            <p className="text-sm text-green-200">
              Total Transactions
            </p>

            <h3 className="text-3xl font-bold mt-2">
              {transactionsCount}
            </h3>

            <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-white/20 text-sm">
              <div>
                <p className="text-green-200 text-xs">Sales</p>
                <strong>{report.sales.length}</strong>
              </div>

              <div>
                <p className="text-green-200 text-xs">Purchases</p>
                <strong>{report.purchases.length}</strong>
              </div>

              <div>
                <p className="text-green-200 text-xs">Expenses</p>
                <strong>{report.expenses.length}</strong>
              </div>
            </div>
          </section>

          <p className="text-xs text-gray-400 mt-5 leading-relaxed">
            Cash and UPI movement excludes opening balances. It includes
            payments received and made during the selected period.
            This is not net profit: purchases may include inventory that
            has not yet been consumed.
          </p>
        </>
      )}
    </main>
  );
}

function ReportRow({ label, value, positive, bold }) {
  return (
    <div className="flex justify-between items-center gap-3">
      <span className={bold ? "font-bold text-gray-900" : "text-gray-500"}>
        {label}
      </span>

      <strong
        className={`shrink-0 ${
          bold
            ? "text-[#173F35]"
            : positive
            ? "text-green-700"
            : "text-gray-800"
        }`}
      >
        {value}
      </strong>
    </div>
  );
}
