import React from 'react';
import { ResilientImage } from './ResilientImage';
import qualityGradingImg from '../assets/images/supply_quality_grading_1792858425089.jpg';
import truckLogisticsImg from '../assets/images/supply_truck_logistics_1792858425503.jpg';

export const SupplyChainSection: React.FC = () => {
  return (
    <>
      {/* Core Capabilities — Asymmetric Bento Grid */}
      <section id="supply-chain" className="py-14 lg:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-10">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-2">
              <span>Supply Chain Architecture</span>
              <span aria-hidden="true">·</span>
              <span>Farmgate to Institutional Buyer</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              How MandiLens removes opacity across agricultural procurement
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600">
              Price numbers alone are misleading when quality grades and transport deductions vary
              by yard. We standardize physical lot specs alongside logistics math.
            </p>
          </div>

          {/* Asymmetric Bento Grid: 2-span + 1-span row, followed by 1-span + 2-span row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Marquee Capability 01 (col-span-2) */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
              <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <span className="font-mono tabular-nums text-xs font-semibold text-green-800">
                    01. Grade &amp; Moisture Normalization
                  </span>
                  <h3 className="font-display text-xl font-bold text-slate-900 mt-2">
                    Assay-calibrated rates instead of vague min–max averages
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    A ₹500/qtl spread at a single mandi reflects moisture percentage, bulb diameter,
                    and foreign-matter tolerances. MandiLens maps auction clearing prices directly to
                    physical FAQ and Sortex assay thresholds so FPO packhouses sort lots to exact
                    buyer specs before loading trucks.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>Moisture Assay Parity</span>
                  <span aria-hidden="true">·</span>
                  <span>Size &amp; Admixture Indexing</span>
                  <span aria-hidden="true">·</span>
                  <span>e-NAM Lot Mapping</span>
                </div>
              </div>
              <div className="md:col-span-5 min-h-[220px] border-t md:border-t-0 md:border-l border-slate-200">
                <ResilientImage
                  src={qualityGradingImg}
                  alt="Agricultural packhouse technician weighing golden soybeans and checking moisture percentage next to crates of sorted red onions"
                  fallbackTitle="Packhouse Moisture & Grade Verification"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Capability 02 (col-span-1) */}
            <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <span className="font-mono tabular-nums text-xs font-semibold text-green-800">
                  02. Arrival Glut Warnings
                </span>
                <h3 className="font-display text-xl font-bold text-slate-900 mt-2">
                  Gate queue &amp; arrival surge tracking before market open
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  When inward gate arrivals exceed a mandi’s 14-day rolling average by 25%+,
                  perishable clearing prices drop sharply by afternoon auction. Early gate tallies
                  let collectives divert trucks or stagger harvesting by 24 hours.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-500">Morning Gate Cut-off</span>
                  <span className="font-mono tabular-nums text-sm font-semibold text-slate-900">
                    06:45 AM IST
                  </span>
                </div>
              </div>
            </div>

            {/* Capability 03 (col-span-1) */}
            <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <span className="font-mono tabular-nums text-xs font-semibold text-green-800">
                  03. Direct Mill &amp; Buyer Benchmarks
                </span>
                <h3 className="font-display text-xl font-bold text-slate-900 mt-2">
                  Farmgate parity sheets for processors and modern retail
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Flour mills, dal processors, and retail distribution centers benchmark direct FPO
                  purchase contracts against live APMC modal rates minus dual-handling fees—sharing
                  saved commission fairly between farmer and buyer.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-500">Dual-Handling Saved</span>
                  <span className="font-mono tabular-nums text-sm font-semibold text-green-800">
                    2.2% – 3.8% / lot
                  </span>
                </div>
              </div>
            </div>

            {/* Marquee Capability 04 (col-span-2) */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
              <div className="md:col-span-5 min-h-[220px] border-b md:border-b-0 md:border-r border-slate-200">
                <ResilientImage
                  src={truckLogisticsImg}
                  alt="Commercial freight trucks loading crated fresh produce at a clean rural agricultural aggregation dock at sunrise"
                  fallbackTitle="Multi-Mandi Line-Haul Dispatch Routing"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <span className="font-mono tabular-nums text-xs font-semibold text-green-800">
                    04. Multi-Corridor Freight Telemetry
                  </span>
                  <h3 className="font-display text-xl font-bold text-slate-900 mt-2">
                    Load-consolidation &amp; backhaul freight indexing for FPOs
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    Smallholder lots of 12–18 quintals suffer punitive per-quintal transport costs
                    in half-empty pickups. MandiLens pairs daily cluster harvest calendars with 9T
                    and 16T LCV/ICV freight benchmarks so neighboring FPOs pool dispatches.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>Per-Quintal Freight Ledger</span>
                  <span aria-hidden="true">·</span>
                  <span>Shrinkage Curves</span>
                  <span aria-hidden="true">·</span>
                  <span>Cluster Pooling</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Adjacent Proof of Impact / Attributable Field Case Studies */}
      <section id="case-studies" className="py-14 lg:py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-10">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-2">
              <span>Verified Field Outcomes</span>
              <span aria-hidden="true">·</span>
              <span>Kharif &amp; Rabi Seasons 2025–2026</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Measured supply chain impact across producer collectives
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Case Study 1 */}
            <article className="border border-slate-200 rounded-xl p-6 sm:p-7 flex flex-col justify-between bg-white">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>Nashik District, MH</span>
                  <span aria-hidden="true">·</span>
                  <span>1,420 Member Growers</span>
                </div>
                <p className="mt-4 font-mono tabular-nums text-2xl font-bold text-green-800">
                  +₹215 / qtl Net Payout
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Recorded across 48,000 quintals of summer red onion over 4 months
                </p>
                <p className="mt-4 text-sm leading-relaxed text-slate-700">
                  “Before MandiLens, we routinely sent 9-tonne trucks to metro terminals whenever
                  headline rates looked high, losing margin on waiting charges and shrinkage. Using
                  the pre-dispatch freight calculator, 38% of our lots shifted to graded district
                  hubs with faster cash settlement.”
                </p>
              </div>
              <footer className="mt-6 pt-4 border-t border-slate-100">
                <p className="text-sm font-semibold text-slate-900">Rajeshwar Pawar</p>
                <p className="text-xs text-slate-500">
                  Chief Executive Officer · Godavari Basin Onion Producer Co. Ltd.
                </p>
              </footer>
            </article>

            {/* Case Study 2 */}
            <article className="border border-slate-200 rounded-xl p-6 sm:p-7 flex flex-col justify-between bg-white">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>Dewas &amp; Sehore, MP</span>
                  <span aria-hidden="true">·</span>
                  <span>Soybean &amp; Sharbati Wheat</span>
                </div>
                <p className="mt-4 font-mono tabular-nums text-2xl font-bold text-green-800">
                  −64% Moisture Deductions
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Across 310 direct-to-solvent-plant institutional dispatches in Rabi 2026
                </p>
                <p className="mt-4 text-sm leading-relaxed text-slate-700">
                  “Traders previously docked ₹180 per quintal claiming excess moisture without
                  showing benchmark spreads. Publishing daily <span className="font-mono">11.5% H2O</span>{' '}
                  assay parity sheets at our collection center gave farmers leverage to dry grain
                  for one extra afternoon and capture full Grade-A mill rates.”
                </p>
              </div>
              <footer className="mt-6 pt-4 border-t border-slate-100">
                <p className="text-sm font-semibold text-slate-900">Meenakshi Patidar</p>
                <p className="text-xs text-slate-500">
                  Procurement Lead · Narmada Malwa Krishi Farmer Producer Org.
                </p>
              </footer>
            </article>

            {/* Case Study 3 */}
            <article className="border border-slate-200 rounded-xl p-6 sm:p-7 flex flex-col justify-between bg-white">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>Kolar &amp; Chikkaballapur, KA</span>
                  <span aria-hidden="true">·</span>
                  <span>Perishable Crate Logistics</span>
                </div>
                <p className="mt-4 font-mono tabular-nums text-2xl font-bold text-green-800">
                  3.1% Lower Procurement Cost
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  For regional retail buyers across 1,950 MT of graded hybrid tomato &amp; capsicum
                </p>
                <p className="mt-4 text-sm leading-relaxed text-slate-700">
                  “Indexing farmgate-to-terminal cost waterfalls allowed our buying desk to sign
                  transparent modal-linked contracts directly with three Kolar packhouses—cutting
                  double unloading damage while paying growers ₹110/qtl above local sub-yard net.”
                </p>
              </div>
              <footer className="mt-6 pt-4 border-t border-slate-100">
                <p className="text-sm font-semibold text-slate-900">Karthik Narayanan</p>
                <p className="text-xs text-slate-500">
                  Head of Fresh Sourcing · Dakshin Agro Supply Chain Pvt. Ltd.
                </p>
              </footer>
            </article>
          </div>
        </div>
      </section>
    </>
  );
};
