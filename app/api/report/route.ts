import { NextRequest, NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const { invoices } = await req.json();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY missing on server" }, { status: 500 });
  }

  const totalSpend = invoices.reduce((s: number, i: any) => s + (i.amount || 0), 0);
  const flagged = invoices.filter((i: any) => i.status === "flagged");
  const flaggedCount = flagged.length;
  const categoryTotals = invoices.reduce((acc: any, i: any) => {
    acc[i.category] = (acc[i.category] || 0) + (i.amount || 0);
    return acc;
  }, {});

  const flaggedDetails = flagged.map((i: any) => `${i.vendor}: ${i.reason || "flagged"}`);

  const prompt = `You are a reporting agent for a small business expense dashboard in Pakistan.
Write a short 2-3 sentence plain-English summary a shop owner can quickly understand.

Rules:
- All amounts are in Pakistani Rupees. Write them as "Rs. 154,580". Never use "$".
- Only mention issues that appear in the flagged list below. Do not invent any.

Total spend: ${totalSpend}
Number of invoices: ${invoices.length}
Flagged invoices: ${flaggedCount}
Flagged details: ${flaggedDetails.length ? flaggedDetails.join(" | ") : "none"}
Category breakdown: ${JSON.stringify(categoryTotals)}`;

  try {
    const text = await callGemini([{ text: prompt }], apiKey);
    return NextResponse.json({ summary: text, totalSpend, flaggedCount });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
