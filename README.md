# SME Invoice Compliance Automation

Multi-agent system (Next.js + Gemini API): **Extraction Agent → Compliance Agent → Reporting Agent**

- **Extraction Agent** (`app/api/extract/route.ts`) — reads an invoice/receipt image and pulls out vendor, date, amounts, tax rate, NTN/STRN, etc. Leaves a field as `null` instead of guessing if it isn't on the document.
- **Compliance Agent** (`app/api/compliance/route.ts`) — plain TypeScript rules (no LLM call): checks required fields, standard tax rate (18%, sample only), and that subtotal + tax = total.
- **Reporting Agent** (`app/api/report/route.ts`) — writes a short plain-English spending summary in PKR.
- **Frontend** (`app/page.tsx`) — upload box, totals, category breakdown, and a table with flagged reasons. Data is saved to the browser's `localStorage`, so it survives a page refresh (but only on this browser/computer).

## Setup (Windows / PowerShell)

1. **Unzip this folder** somewhere easy to find, e.g. `C:\Users\<you>\Documents\sme-invoice-ai`.

2. **Open a terminal in that folder.** In File Explorer, open the folder, click the address bar, type `powershell`, press Enter.

3. **Install dependencies:**
   ```powershell
   npm install
   ```

4. **Add your Gemini API key:**
   ```powershell
   Copy-Item .env.local.example .env.local
   notepad .env.local
   ```
   Replace `your_gemini_api_key_here` with your real key (from [Google AI Studio](https://aistudio.google.com/apikey)), no quotes needed. Save and close.

5. **Run it:**
   ```powershell
   npm run dev
   ```
   Open **http://localhost:3000** in your browser.

6. **Test it:** upload an invoice image. Watch the terminal for errors if something fails.

## Notes

- Never run `npm audit fix --force` — on this project it has previously downgraded Next.js to a very old version and broken the build. If `npm audit` shows vulnerabilities, upgrade the specific package by name instead (e.g. `npm install next@latest`).
- `.env.local` is already excluded in `.gitignore` — never commit it or share it.
- The 18% standard tax rate in the compliance agent is a placeholder for testing. Verify current FBR requirements before using this for real compliance decisions.
- Data is stored only in the browser's `localStorage` (not a database), so it's per-browser and per-device, and clearing browser data will erase it.
