// ── PDF Generator ─────────────────────────────────────────────
// Opens a clean white print window — no external libs needed

export const printPDF = (title, htmlContent) => {
  const win = window.open('', '_blank')
  win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 32px; font-size: 13px; line-height: 1.6; }
  h1 { font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #050d1f; margin-bottom: 4px; }
  h2 { font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #1a6bff; margin: 20px 0 8px; border-bottom: 2px solid #1a6bff; padding-bottom: 4px; }
  h3 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #050d1f; margin: 12px 0 4px; }
  .header { border-bottom: 3px solid #050d1f; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
  .brand { font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #8a9ab5; }
  .date { font-size: 11px; color: #8a9ab5; }
  .section { margin-bottom: 20px; }
  .card { border: 1px solid #e0e4ef; border-radius: 8px; padding: 14px; margin-bottom: 10px; break-inside: avoid; }
  .card.action { border-left: 4px solid #1a6bff; }
  .card.complete { border-left: 4px solid #22c55e; background: #f0fdf4; }
  .card.incomplete { border-left: 4px solid #f59e0b; background: #fffbeb; }
  .label { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #8a9ab5; margin-bottom: 4px; }
  .value { font-size: 13px; color: #1a1a2e; }
  .tag { display: inline-block; background: #e8edf8; color: #1a6bff; font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; padding: 2px 8px; border-radius: 100px; margin-right: 6px; }
  .tag.green { background: #dcfce7; color: #16a34a; }
  .tag.red { background: #fee2e2; color: #dc2626; }
  .tag.yellow { background: #fef9c3; color: #ca8a04; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .step-row { display: flex; gap: 10px; margin-bottom: 8px; align-items: flex-start; }
  .step-num { background: #050d1f; color: #fff; font-weight: 900; font-size: 12px; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .notes-box { background: #f8f9fc; border: 1px solid #e0e4ef; border-radius: 6px; padding: 10px; margin-top: 6px; font-style: italic; color: #444; font-size: 12px; }
  .empty-box { background: #f8f9fc; border: 1px dashed #c0c8d8; border-radius: 6px; padding: 10px; color: #8a9ab5; font-style: italic; font-size: 12px; }
  .action-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  .action-table th { background: #050d1f; color: #fff; font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; padding: 8px 10px; text-align: left; }
  .action-table td { padding: 8px 10px; border-bottom: 1px solid #e0e4ef; font-size: 12px; vertical-align: top; }
  .action-table tr:last-child td { border: none; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e0e4ef; font-size: 10px; color: #8a9ab5; display: flex; justify-content: space-between; }
  @media print {
    body { padding: 20px; }
    .no-print { display: none; }
    h2 { break-after: avoid; }
    .card { break-inside: avoid; }
  }
  .print-btn { background: #1a6bff; color: #fff; border: none; padding: 10px 24px; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; margin-bottom: 20px; }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">🖨 Print / Save as PDF</button>
${htmlContent}
<div class="footer">
  <span>5-Minute Dealer Coaching System · 5minutedealercoach.com</span>
  <span>Generated ${new Date().toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'})}</span>
</div>
</body>
</html>`)
  win.document.close()
}
