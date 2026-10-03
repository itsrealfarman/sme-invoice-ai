"use client";

import { useState, useEffect, Fragment } from "react";

type Invoice = {
  id: string;
  vendor: string;
  date: string;
  amount: number;
  tax: number;
  category: string;
  status: "ok" | "flagged";
  reason: string;
};

function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function labelCategory(cat: string) {
  return cat.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export default function Home() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [agentStatus, setAgentStatus] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sme-invoices");
      if (saved) setInvoices(JSON.parse(saved));
      const savedSummary = localStorage.getItem("sme-summary");
      if (savedSummary) setSummary(savedSummary);
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem("sme-invoices", JSON.stringify(invoices));
    localStorage.setItem("sme-summary", summary);
  }, [invoices, summary, loaded]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setLoading(true);

    try {
      const { base64, mimeType } = await fileToBase64(file);

      setAgentStatus("Extraction agent is reading the invoice...");
      const extractRes = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });
      const extractJson = await extractRes.json();
      if (extractJson.error) throw new Error(extractJson.error);
      const extracted = extractJson.data;

      setAgentStatus("Compliance agent is checking the rules...");
      const complianceRes = await fetch("/api/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice: extracted }),
      });
      const complianceJson = await complianceRes.json();
      if (complianceJson.error) throw new Error(complianceJson.error);
      const compliance = complianceJson.data;

      const newInvoice: Invoice = {
        id: crypto.randomUUID(),
        vendor: extracted.vendor || "Unknown",
        date: extracted.date || "",
        amount: Number(extracted.amount) || 0,
        tax: Number(extracted.tax) || 0,
        category: extracted.category || "other",
        status: compliance.status === "flagged" ? "flagged" : "ok",
        reason: compliance.reason || "",
      };

      const updated = [...invoices, newInvoice];
      setInvoices(updated);

      setAgentStatus("Reporting agent is updating the summary...");
      const reportRes = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoices: updated }),
      });
      const reportJson = await reportRes.json();
      if (!reportJson.error) setSummary(reportJson.summary);

      setAgentStatus("Entry recorded.");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setAgentStatus("");
    } finally {
      setLoading(false);
      setTimeout(() => setAgentStatus(""), 2500);
      e.target.value = "";
    }
  }

  const totalSpend = invoices.reduce((s, i) => s + i.amount, 0);
  const flaggedCount = invoices.filter((i) => i.status === "flagged").length;
  const categoryTotals: Record<string, number> = {};
  invoices.forEach((i) => {
    categoryTotals[i.category] = (categoryTotals[i.category] || 0) + i.amount;
  });

  return (
    <main className="min-h-screen px-6 py-10 md:py-16 font-sans">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-serif text-4xl md:text-5xl font-semibold leading-tight">
          SME Invoice Ledger
        </h1>
        <p className="mt-3 text-ink-soft max-w-md">
          Every receipt passes through three hands before it reaches the book —
          extraction, compliance review, then the summary.
        </p>

        <div className="mt-10 border border-rule bg-paper-dim/50 p-6">
          <p className="font-serif text-lg mb-3">Attach a receipt or invoice</p>
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={loading}
            className="text-sm file:mr-4 file:border file:border-ink file:bg-paper file:px-3 file:py-1.5 file:text-sm file:font-medium file:cursor-pointer hover:file:bg-ink hover:file:text-paper cursor-pointer"
          />
          {agentStatus && (
            <p className="mt-4 text-sm text-navy">{agentStatus}</p>
          )}
          {error && <p className="mt-4 text-sm text-stampRed">{error}</p>}
        </div>

        {invoices.length > 0 && (
          <>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setInvoices([]);
                  setSummary("");
                }}
                className="text-xs text-ink-soft hover:text-stampRed underline underline-offset-4"
              >
                Clear all entries
              </button>
            </div>

            <div className="mt-6 grid grid-cols-3 border-y border-ink/70 divide-x divide-rule">
              <div className="py-4 pr-4">
                <p className="text-sm text-ink-soft">Total spend</p>
                <p className="font-mono text-2xl md:text-3xl mt-1">
                  Rs {totalSpend.toLocaleString()}
                </p>
              </div>
              <div className="py-4 px-4">
                <p className="text-sm text-ink-soft">Processed</p>
                <p className="font-mono text-2xl md:text-3xl mt-1">{invoices.length}</p>
              </div>
              <div className="py-4 pl-4">
                <p className="text-sm text-ink-soft">Flagged</p>
                <p className="font-mono text-2xl md:text-3xl mt-1 text-stampRed">
                  {flaggedCount}
                </p>
              </div>
            </div>

            {summary && (
              <div className="mt-10 border-l-2 border-mustard pl-5 py-1">
                <p className="font-serif text-base text-ink-soft mb-1">Summary</p>
                <p className="text-[15px] leading-relaxed">{summary}</p>
              </div>
            )}

            <div className="mt-10">
              <p className="font-serif text-lg mb-4">Where the money went</p>
              {Object.entries(categoryTotals).map(([cat, amt]) => (
                <div key={cat} className="mb-4">
                  <div className="flex justify-between items-baseline text-sm mb-1">
                    <span>{labelCategory(cat)}</span>
                    <span className="font-mono">Rs {amt.toLocaleString()}</span>
                  </div>
                  <div className="h-[3px] bg-rule/60 w-full">
                    <div
                      className="h-full bg-navy"
                      style={{ width: `${totalSpend ? (amt / totalSpend) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <table className="mt-10 w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-ink">
                  <th className="text-left font-serif font-medium py-2 pr-3">Vendor</th>
                  <th className="text-left font-serif font-medium py-2 pr-3">Date</th>
                  <th className="text-left font-serif font-medium py-2 pr-3">Amount</th>
                  <th className="text-left font-serif font-medium py-2 pr-3">Category</th>
                  <th className="text-right font-serif font-medium py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <Fragment key={inv.id}>
                    <tr className="border-b border-rule">
                      <td className="py-3 pr-3">{inv.vendor}</td>
                      <td className="py-3 pr-3 font-mono text-ink-soft">
                        {inv.date || "—"}
                      </td>
                      <td className="py-3 pr-3 font-mono">
                        Rs {inv.amount.toLocaleString()}
                      </td>
                      <td className="py-3 pr-3 text-ink-soft">
                        {labelCategory(inv.category)}
                      </td>
                      <td className="py-3 text-right">
                        {inv.status === "flagged" ? (
                          <span className="inline-block border border-stampRed text-stampRed px-2 py-0.5 text-xs tracking-wide -rotate-2">
                            Flagged
                          </span>
                        ) : (
                          <span className="inline-block border border-stampGreen text-stampGreen px-2 py-0.5 text-xs tracking-wide -rotate-2">
                            Verified
                          </span>
                        )}
                      </td>
                    </tr>
                    {inv.status === "flagged" && inv.reason && (
                      <tr className="border-b border-rule bg-stampRed/5">
                        <td colSpan={5} className="pb-3 pr-3 text-xs text-ink-soft">
                          <span className="text-stampRed">Issues — </span>
                          {inv.reason.split("; ").join(" • ")}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </main>
  );
}