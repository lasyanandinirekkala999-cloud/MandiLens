import React, { useState } from 'react';
import { Download, FileJson, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import {
  CalculatorSnapshotSummary,
  DATASET_SCENARIOS,
  DatasetScenarioId,
  MandiLotRecord,
  TradeDealRecord,
} from '../data/mandiData';

interface ExportableReportProps {
  activeScenarioId: DatasetScenarioId;
  filteredRecords: MandiLotRecord[];
  calculatorSnapshot: CalculatorSnapshotSummary | null;
  deals: TradeDealRecord[];
}

export const ExportableReport: React.FC<ExportableReportProps> = ({
  activeScenarioId,
  filteredRecords,
  calculatorSnapshot,
  deals,
}) => {
  const [preparedFor, setPreparedFor] = useState(
    'FPO Dispatch & Institutional Procurement Committee'
  );
  const [analystNote, setAnalystNote] = useState(
    'Prioritize dry-cured Grade A dispatches before 07:30 AM gate cut-off; route medium lots to district hubs to preserve net freight margin.'
  );
  const [includeMarketTable, setIncludeMarketTable] = useState(true);
  const [includeCalculator, setIncludeCalculator] = useState(true);
  const [includeDeals, setIncludeDeals] = useState(true);

  const scenario =
    DATASET_SCENARIOS.find((s) => s.id === activeScenarioId) || DATASET_SCENARIOS[0];

  const reportRecords = filteredRecords.slice(0, 8);
  const generatedDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const handlePrintPdf = () => {
    window.print();
  };

  const handleDownloadMarkdownMemo = () => {
    const lines: string[] = [
      `# MANDILENS — MARKET & SUPPLY CHAIN INTELLIGENCE DOSSIER`,
      `Prepared For: ${preparedFor}`,
      `Date: ${generatedDate} | Active Scenario: ${scenario.name} (${scenario.seasonTag})`,
      ``,
      `## Field Dispatch Note`,
      analystNote,
      ``,
    ];

    if (includeMarketTable) {
      lines.push(`## 1. Wholesale APMC Clearing Rates (Top ${reportRecords.length} Filtered Yards)`);
      lines.push(
        `| APMC Code | Commodity & Grade | Mandi Yard | Modal (INR/qtl) | 24h Shift | Arrivals (qtl) | Farmgate Net |`
      );
      lines.push(`| :--- | :--- | :--- | ---: | ---: | ---: | ---: |`);
      reportRecords.forEach((r) => {
        lines.push(
          `| ${r.apmcCode} | ${r.commodity} (${r.grade}) | ${r.mandi}, ${r.state} | ₹${r.modalPrice} | ${
            r.change24hPct >= 0 ? '+' : ''
          }${r.change24hPct}% | ${r.arrivalsQtl} | ₹${r.supplyChain.farmgateNet} |`
        );
      });
      lines.push(``);
    }

    if (includeCalculator && calculatorSnapshot) {
      lines.push(
        `## 2. Net Realization & Freight Comparison (${calculatorSnapshot.lotQtl} qtl Lot)`
      );
      lines.push(
        `Optimal Dispatch Verdict: **${calculatorSnapshot.bestMandiName}** at ₹${Math.round(
          calculatorSnapshot.bestNetPerQtl
        )}/qtl net (Total ₹${Math.round(
          calculatorSnapshot.bestNetTotalInr
        ).toLocaleString('en-IN')}, +₹${calculatorSnapshot.advantageTotalInr.toLocaleString(
          'en-IN'
        )} vs. ${calculatorSnapshot.runnerUpName}).`
      );
      lines.push(``);
      lines.push(
        `| Candidate Market | Distance (km) | Gross Modal (INR/qtl) | Deductions (INR) | Net Payout (INR/qtl) | Total Net (INR) |`
      );
      lines.push(`| :--- | ---: | ---: | ---: | ---: | ---: |`);
      calculatorSnapshot.evaluatedMarkets.forEach((m) => {
        lines.push(
          `| ${m.name} | ${m.distanceKm} km | ₹${m.modalPriceQtl} | ₹${Math.round(
            m.totalDeductionsInr
          )} | ₹${Math.round(m.netPerQtl)} | ₹${Math.round(m.netTotalInr)} |`
        );
      });
      lines.push(``);
    }

    if (includeDeals && deals.length > 0) {
      lines.push(`## 3. Active Seller-Buyer Direct Parity Contracts`);
      lines.push(
        `| Ref Code | Commodity | Seller -> Buyer | Qty (qtl) | Agreed Parity Rate | Stage |`
      );
      lines.push(`| :--- | :--- | :--- | ---: | ---: | :--- |`);
      deals.forEach((d) => {
        lines.push(
          `| ${d.referenceCode} | ${d.commodity} | ${d.sellerName} -> ${d.buyerName} | ${d.quantityQtl} | ₹${d.agreedParityPriceQtl}/qtl | ${d.stage} |`
        );
      });
      lines.push(``);
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mandilens_dispatch_dossier_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsvReport = () => {
    const headers = [
      'APMC_Code',
      'Commodity',
      'Variety',
      'Grade',
      'Mandi',
      'District',
      'State',
      'Min_INR_Qtl',
      'Modal_INR_Qtl',
      'Max_INR_Qtl',
      'Change_24h_Pct',
      'Arrivals_Qtl',
      'Farmgate_Net_INR_Qtl',
      'Terminal_Landed_INR_Qtl',
    ];
    const rows = filteredRecords.map((r) => [
      r.apmcCode,
      `"${r.commodity}"`,
      `"${r.variety}"`,
      `"${r.grade}"`,
      `"${r.mandi}"`,
      `"${r.district}"`,
      `"${r.state}"`,
      r.minPrice,
      r.modalPrice,
      r.maxPrice,
      r.change24hPct,
      r.arrivalsQtl,
      r.supplyChain.farmgateNet,
      r.supplyChain.terminalLandedPrice,
    ]);
    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mandilens_market_report_${scenario.id}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAuditJson = () => {
    const bundle = {
      dossier_title: 'MandiLens Transparent Market & Supply Chain Intelligence Report',
      prepared_for: preparedFor,
      generated_date: generatedDate,
      analyst_note: analystNote,
      scenario,
      market_rates: includeMarketTable ? filteredRecords : [],
      arbitrage_comparison: includeCalculator ? calculatorSnapshot : null,
      parity_trade_ledger: includeDeals ? deals : [],
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mandilens_intelligence_bundle_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section
      id="intelligence-report"
      className="py-12 lg:py-16 bg-white border-b border-slate-200"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-8 no-print">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-2">
            <span>Boardroom &amp; Packhouse Brief</span>
            <span aria-hidden="true">·</span>
            <span>PDF Print, Markdown Memo, CSV &amp; JSON Audit</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Exportable Market &amp; Supply Chain Intelligence Report
          </h2>
          <p className="mt-1.5 text-sm sm:text-base text-slate-600 max-w-2xl">
            Compile your live filtered mandi dashboard rates, side-by-side freight route math, and
            locked FPO–buyer parity deals into a clean dispatch dossier for offline field committees
            or ERP import.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Report Customizer & Multi-Format Export Controls */}
          <div className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5 no-print">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                Configure Dossier Contents
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Customize header attribution and toggle report modules before exporting
              </p>
            </div>

            <div>
              <label
                htmlFor="rep-prepared"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Prepared For (FPO / Procurement Desk)
              </label>
              <input
                id="rep-prepared"
                type="text"
                value={preparedFor}
                onChange={(e) => setPreparedFor(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-green-800"
              />
            </div>

            <div>
              <label
                htmlFor="rep-note"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Executive Dispatch Advisory Note
              </label>
              <textarea
                id="rep-note"
                rows={3}
                value={analystNote}
                onChange={(e) => setAnalystNote(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-green-800"
              />
            </div>

            <fieldset className="space-y-2.5 pt-2 border-t border-slate-200">
              <legend className="text-xs font-semibold text-slate-700 mb-1">
                Included Intelligence Modules
              </legend>
              <label className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeMarketTable}
                  onChange={(e) => setIncludeMarketTable(e.target.checked)}
                  className="accent-green-800 w-4 h-4 rounded"
                />
                <span>Wholesale APMC Clearing Table ({reportRecords.length} rows)</span>
              </label>
              <label className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCalculator}
                  onChange={(e) => setIncludeCalculator(e.target.checked)}
                  className="accent-green-800 w-4 h-4 rounded"
                />
                <span>Freight &amp; Net Realization Comparison Verdict</span>
              </label>
              <label className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDeals}
                  onChange={(e) => setIncludeDeals(e.target.checked)}
                  className="accent-green-800 w-4 h-4 rounded"
                />
                <span>Seller–Buyer Parity Settlement Ledger ({deals.length})</span>
              </label>
            </fieldset>

            <div className="pt-3 border-t border-slate-200 space-y-2.5">
              <button
                type="button"
                onClick={handlePrintPdf}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-green-800 rounded-lg hover:bg-green-900 transition-colors whitespace-nowrap"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save Official PDF Brief</span>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadMarkdownMemo}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-600" />
                  <span>Download Dispatch Memo (.md)</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadCsvReport}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
                  <span>Export Filtered Rates (.csv)</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadAuditJson}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap"
                >
                  <FileJson className="w-3.5 h-3.5 text-slate-600" />
                  <span>Export Full Audit JSON (.json)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right: Live Institutional Broadsheet Report Preview (Print-Isolated) */}
          <div
            id="printable-dossier"
            className="lg:col-span-8 bg-white border border-slate-300 rounded-xl p-6 sm:p-8 space-y-6"
          >
            {/* Dossier Masthead */}
            <div className="border-b border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-green-800">
                  MandiLens · Agricultural Supply Chain &amp; Price Intelligence Brief
                </p>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                  {preparedFor || 'Daily Dispatch & Procurement Dossier'}
                </h3>
              </div>
              <div className="text-left sm:text-right font-mono tabular-nums text-xs text-slate-600">
                <p>Issued: {generatedDate}</p>
                <p>Regime: {scenario.name}</p>
              </div>
            </div>

            {/* Advisory Summary */}
            {analystNote && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-slate-700 mb-1">
                  Dispatch &amp; Procurement Advisory
                </p>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{analystNote}</p>
              </div>
            )}

            {/* Module 1: Wholesale APMC Clearing Table */}
            {includeMarketTable && (
              <div>
                <div className="flex items-baseline justify-between mb-2.5">
                  <h4 className="font-display text-sm font-bold text-slate-900">
                    01. Indexed APMC Clearing &amp; Net Farmgate Sheet
                  </h4>
                  <span className="text-xs text-slate-500 font-mono tabular-nums">
                    Showing {reportRecords.length} of {filteredRecords.length} filtered lots
                  </span>
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <th className="py-2 px-3 whitespace-nowrap">Code</th>
                        <th className="py-2 px-3 whitespace-nowrap">Commodity &amp; Grade</th>
                        <th className="py-2 px-3 whitespace-nowrap">APMC Yard</th>
                        <th className="py-2 px-3 text-right whitespace-nowrap">Modal (/qtl)</th>
                        <th className="py-2 px-3 text-right whitespace-nowrap">Farmgate Net</th>
                        <th className="py-2 px-3 text-right whitespace-nowrap">Arrivals</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                      {reportRecords.map((r) => (
                        <tr key={r.id}>
                          <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                            {r.apmcCode}
                          </td>
                          <td className="py-2 px-3 font-sans font-medium text-slate-900">
                            {r.commodity} · <span className="text-slate-500">{r.grade}</span>
                          </td>
                          <td className="py-2 px-3 font-sans text-slate-700">
                            {r.mandi}, {r.state}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                            ₹{r.modalPrice.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 text-right text-green-800 font-semibold whitespace-nowrap">
                            ₹{r.supplyChain.farmgateNet.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600 whitespace-nowrap">
                            {r.arrivalsQtl.toLocaleString('en-IN')} qtl
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Module 2: Side-by-Side Calculator Route Verdict */}
            {includeCalculator && calculatorSnapshot && (
              <div>
                <div className="flex items-baseline justify-between mb-2.5">
                  <h4 className="font-display text-sm font-bold text-slate-900">
                    02. Supply Chain Route Comparison ({calculatorSnapshot.lotQtl} qtl Dispatch)
                  </h4>
                  <span className="text-xs font-semibold text-green-800">
                    Optimal: {calculatorSnapshot.bestMandiName}
                  </span>
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <th className="py-2 px-3 whitespace-nowrap">Candidate Market</th>
                        <th className="py-2 px-3 text-right whitespace-nowrap">Distance</th>
                        <th className="py-2 px-3 text-right whitespace-nowrap">Gross Modal</th>
                        <th className="py-2 px-3 text-right whitespace-nowrap">
                          Freight + Cess + Loss
                        </th>
                        <th className="py-2 px-3 text-right whitespace-nowrap">Net / qtl</th>
                        <th className="py-2 px-3 text-right whitespace-nowrap">Total Net</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                      {calculatorSnapshot.evaluatedMarkets.map((m) => {
                        const isBest = m.name === calculatorSnapshot.bestMandiName;
                        return (
                          <tr key={m.name} className={isBest ? 'bg-green-50/60' : ''}>
                            <td className="py-2 px-3 font-sans font-semibold text-slate-900">
                              {m.name} {isBest ? '(Optimal)' : ''}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-600 whitespace-nowrap">
                              {m.distanceKm} km
                            </td>
                            <td className="py-2 px-3 text-right text-slate-800 whitespace-nowrap">
                              ₹{m.modalPriceQtl.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2 px-3 text-right text-red-700 whitespace-nowrap">
                              −₹{Math.round(m.totalDeductionsInr).toLocaleString('en-IN')}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-green-800 whitespace-nowrap">
                              ₹{Math.round(m.netPerQtl).toLocaleString('en-IN')}
                            </td>
                            <td className="py-2 px-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                              ₹{Math.round(m.netTotalInr).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Module 3: Active Seller-Buyer Direct Parity Contracts */}
            {includeDeals && deals.length > 0 && (
              <div>
                <div className="flex items-baseline justify-between mb-2.5">
                  <h4 className="font-display text-sm font-bold text-slate-900">
                    03. Locked Seller–Buyer Direct Parity Term Sheets
                  </h4>
                  <span className="text-xs text-slate-500 font-mono tabular-nums">
                    {deals.length} active contracts
                  </span>
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <th className="py-2 px-3 whitespace-nowrap">Lot Ref</th>
                        <th className="py-2 px-3 whitespace-nowrap">Commodity</th>
                        <th className="py-2 px-3 whitespace-nowrap">Counterparties</th>
                        <th className="py-2 px-3 text-right whitespace-nowrap">Volume</th>
                        <th className="py-2 px-3 text-right whitespace-nowrap">Parity Rate</th>
                        <th className="py-2 px-3 whitespace-nowrap">Workflow Stage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                      {deals.map((d) => (
                        <tr key={d.id}>
                          <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap">
                            {d.referenceCode}
                          </td>
                          <td className="py-2 px-3 font-sans text-slate-900">{d.commodity}</td>
                          <td className="py-2 px-3 font-sans text-slate-600">
                            {d.sellerName} → {d.buyerName}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-800 whitespace-nowrap">
                            {d.quantityQtl} qtl
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-green-800 whitespace-nowrap">
                            ₹{d.agreedParityPriceQtl.toLocaleString('en-IN')}/qtl
                          </td>
                          <td className="py-2 px-3 font-sans font-medium text-slate-800 whitespace-nowrap">
                            {d.stage}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Dossier Footer */}
            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
              <span>
                Methodology: APMC open-outcry modal clearing parity adjusted for packhouse assay and
                corridor road freight.
              </span>
              <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                <Download className="w-3 h-3 no-print" />
                <span>MandiLens Verified Ledger</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
