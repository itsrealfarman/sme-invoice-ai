import { NextRequest, NextResponse } from "next/server";

const ALLOWED_CATEGORIES = [
  "raw_material",
  "utilities",
  "rent",
  "office_supplies",
  "transport",
  "other",
];
const STANDARD_TAX_RATE = 18; // sample rule — verify against current FBR rules before relying on this

const num = (v: any): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

const missing = (v: any) => v === null || v === undefined || String(v).trim() === "";
const placeholder = /^(n\/a|na|unknown|vendor|test|none|-+)$/i;
const fmt = (n: number) => n.toLocaleString("en-US");

function checkInvoice(inv: any): string[] {
  const issues: string[] = [];
  const amount = num(inv.amount);
  const subtotal = num(inv.subtotal);
  const tax = num(inv.tax);
  const rate = num(inv.tax_rate);

  // Required fields
  if (amount === null || amount <= 0) issues.push("Total amount is missing or zero");
  if (missing(inv.vendor) || placeholder.test(String(inv.vendor).trim()))
    issues.push("Vendor name is missing");
  if (!ALLOWED_CATEGORIES.includes(inv.category)) issues.push("Invalid category");
  if (missing(inv.date)) issues.push("Invoice date is missing");
  if (missing(inv.invoice_number)) issues.push("Invoice number is missing");
  if (missing(inv.seller_ntn)) issues.push("Seller NTN is missing");
  if (missing(inv.seller_strn)) issues.push("Seller STRN is missing");
  if (missing(inv.buyer_ntn)) issues.push("Buyer NTN is missing");

  // Tax checks
  if (amount !== null && amount > 500 && (tax === null || tax === 0))
    issues.push("No sales tax shown");
  if (rate !== null && rate !== STANDARD_TAX_RATE)
    issues.push(`Tax rate is ${rate}% (standard is ${STANDARD_TAX_RATE}%)`);
  if (subtotal !== null && rate !== null && tax !== null && Math.abs((subtotal * rate) / 100 - tax) > 1)
    issues.push("Tax amount does not match the tax rate");

  // Arithmetic check
  if (subtotal !== null && tax !== null && amount !== null && Math.abs(subtotal + tax - amount) > 1)
    issues.push(
      `Total mismatch: ${fmt(subtotal)} + ${fmt(tax)} = ${fmt(subtotal + tax)}, but invoice shows ${fmt(amount)}`
    );

  return issues;
}

export async function POST(req: NextRequest) {
  try {
    const { invoice } = await req.json();
    const issues = checkInvoice(invoice || {});
    return NextResponse.json({
      data: {
        status: issues.length ? "flagged" : "ok",
        reason: issues.join("; "),
        issues,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
