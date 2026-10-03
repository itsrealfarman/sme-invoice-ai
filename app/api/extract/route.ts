import { NextRequest, NextResponse } from "next/server";
import { callGemini, parseJsonSafe } from "@/lib/gemini";

const EXTRACTION_PROMPT = `You are an invoice/receipt data extraction agent.
Read the image and extract the fields below EXACTLY as printed on the document.

Strict rules:
- If a field is not visible or is blank on the document, return null for it. Never guess, infer, or invent a value.
- Never use today's date. If the date is blank or unreadable, date must be null.
- Copy amounts as printed. Do NOT recalculate or correct any total.
- All numbers must be plain numbers (no commas, no currency symbols).

Return ONLY valid JSON, no markdown formatting, no explanation:
{
  "vendor": "seller name, or null",
  "invoice_number": "string or null",
  "date": "YYYY-MM-DD or null",
  "seller_ntn": "string or null",
  "seller_strn": "string or null",
  "buyer_name": "string or null",
  "buyer_ntn": "string or null",
  "subtotal": "number (amount before tax) or null",
  "tax_rate": "number, percent printed on the invoice (e.g. 18) or null",
  "tax": "number, sales tax amount or null",
  "amount": "number, grand total as printed, or null",
  "category": "one of: raw_material, utilities, rent, office_supplies, transport, other"
}`;

export async function POST(req: NextRequest) {
  const { imageBase64, mimeType } = await req.json();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY missing on server" }, { status: 500 });
  }

  try {
    const text = await callGemini(
      [
        { text: EXTRACTION_PROMPT },
        { inline_data: { mime_type: mimeType, data: imageBase64 } },
      ],
      apiKey
    );
    const parsed = parseJsonSafe(text);
    return NextResponse.json({ data: parsed });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
