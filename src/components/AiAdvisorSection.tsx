import React, { useEffect, useState } from 'react';
import { AlertTriangle, Send, Sparkles } from 'lucide-react';
import { SmartDecisionResult } from '../data/mandiData';

interface AiAdvisorSectionProps {
  decision: SmartDecisionResult;
  externalPromptRequest: { id: number; question: string } | null;
}

interface AiAdviceResponse {
  headlineDecision: string;
  summaryExplanation: string;
  keyReasons: string[];
  timingRecommendation: string;
  riskWarning: string;
  confidenceScore: number;
}

export const AiAdvisorSection: React.FC<AiAdvisorSectionProps> = ({
  decision,
  externalPromptRequest,
}) => {
  const [questionInput, setQuestionInput] = useState<string>('');
  const [activeQuestionLabel, setActiveQuestionLabel] = useState<string>(
    `Baseline Smart Selling Brief for ${decision.quantityQtl} Quintals of ${decision.crop}`
  );
  const [advice, setAdvice] = useState<AiAdviceResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const quickQuestions = [
    `Should I sell all ${decision.quantityQtl} quintals at ${decision.bestMarketCode} today or split my lot?`,
    `What if diesel transport costs ₹50/quintal higher today? Does ${decision.bestMarketCode} still win?`,
    `How do I prevent grading or moisture deductions when selling ${decision.crop} at ${decision.bestMarketCode}?`,
    `Is holding my ${decision.crop} harvest for 2 days worth the spoilage risk?`,
  ];

  const runAdvisorQuery = async (customQuestion: string) => {
    setIsLoading(true);
    setErrorMsg('');
    setActiveQuestionLabel(
      customQuestion ||
        `Smart Selling Analysis · ${decision.crop} (${decision.quantityQtl} Quintals)`
    );

    try {
      const response = await fetch('/api/ai/selling-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: decision.location,
          crop: decision.crop,
          quantityQtl: decision.quantityQtl,
          bestMarketName: `${decision.bestMarketCode} (${decision.bestMarketSubtitle})`,
          bestNetProfit: decision.estimatedNetProfit,
          extraEarnings: decision.potentialExtraEarnings,
          marketsSummary: decision.evaluatedMandis.map((m) => ({
            market: `${m.displayName} (${m.yardSubtitle})`,
            distanceKm: m.distanceKm,
            sellingPricePerQtl: m.sellingPricePerQtl,
            transportTotal: m.transportTotal,
            marketFeeTotal: m.marketFeeTotal,
            priceVariationTotal: m.priceVariationTotal,
            estimatedNetProfit: m.estimatedNetProfit,
          })),
          farmerQuestion: customQuestion,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'AI Advisor could not process your market query.');
      }

      setAdvice(payload as AiAdviceResponse);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to reach MandILens AI Advisor service.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Clear stale AI response when user changes location/crop so default structured guidance matches immediately
  useEffect(() => {
    setAdvice(null);
    setErrorMsg('');
    setActiveQuestionLabel(
      `Baseline Smart Selling Brief · ${decision.crop} (${decision.quantityQtl} Quintals)`
    );
  }, [decision.location, decision.crop, decision.quantityQtl]);

  // Trigger live Gemini query when user clicks "Ask AI Advisor" from the Main Dashboard centerpiece
  useEffect(() => {
    if (externalPromptRequest && externalPromptRequest.question) {
      setQuestionInput(externalPromptRequest.question);
      void runAdvisorQuery(externalPromptRequest.question);
    }
  }, [externalPromptRequest]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = questionInput.trim();
    if (!trimmed) {
      void runAdvisorQuery(quickQuestions[0]);
      return;
    }
    void runAdvisorQuery(trimmed);
  };

  // Fallback baseline view before live custom query is triggered (instant zero-latency content)
  const displayedAdvice: AiAdviceResponse = advice || {
    headlineDecision: `${decision.recommendationHeadline} (${decision.bestMarketSubtitle.split('·')[0].trim()}) for ₹${decision.estimatedNetProfit.toLocaleString('en-IN')} estimated net profit.`,
    summaryExplanation: `For ${decision.quantityQtl} quintals of ${decision.crop} from ${decision.location}, ${decision.bestMarketCode} delivers +₹${decision.potentialExtraEarnings.toLocaleString('en-IN')} higher net take-home than local sub-yard selling after subtracting road transport, APMC fees, and expected price variation.`,
    keyReasons: decision.whyReasons.map((r) => `${r.title}: ${r.detail}`),
    timingRecommendation: `${decision.optimalWindow.gateWindow}. ${decision.optimalWindow.verdictLabel}.`,
    riskWarning: decision.riskWarning.hasWarning ? decision.riskWarning.message : '',
    confidenceScore: decision.aiConfidencePct,
  };

  return (
    <section
      id="ai-advisor"
      className="py-12 lg:py-16 bg-[#F7F7F2] border-b border-[#E2E4DD] no-print"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#15803D] mb-2">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Interactive AI Market Economist</span>
              <span aria-hidden="true" className="text-[#8A928C]">
                •
              </span>
              <span>Contextualized to Your Active Lot</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#161A18]">
              MandILens AI Selling Advisor
            </h2>
            <p className="mt-1.5 text-sm sm:text-base text-[#4A524D] max-w-2xl">
              Ask any question about splitting lots, freight spikes, crate grading, or holding vs.
              dispatching today. Powered by real-time Gemini reasoning over your exact mandi cost
              structure.
            </p>
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={() =>
              void runAdvisorQuery(
                `Give me a complete smart selling action plan for ${decision.quantityQtl} quintals of ${decision.crop} from ${decision.location}.`
              )
            }
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#0F2F1E] rounded-xl hover:bg-[#16422B] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 self-start lg:self-auto"
          >
            <Sparkles className="w-4 h-4 text-[#4ADE80]" />
            <span>{isLoading ? 'Analyzing Market Data...' : 'Generate Live AI Action Plan'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Question Input + 1-Click Scenario Prompts */}
          <div className="lg:col-span-5 bg-white border border-[#E2E4DD] rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-[#161A18]">
                Ask About Your {decision.crop} Lot ({decision.quantityQtl} Quintals)
              </h3>
              <p className="mt-1 text-xs text-[#4A524D]">
                Origin: {decision.location} · Best Market: {decision.bestMarketCode}
              </p>

              <form onSubmit={handleFormSubmit} className="mt-4 space-y-3">
                <label htmlFor="ai-farmer-question" className="sr-only">
                  Ask MandILens AI Advisor a selling question
                </label>
                <textarea
                  id="ai-farmer-question"
                  rows={3}
                  maxLength={300}
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  placeholder={`e.g. Should I dispatch all ${decision.quantityQtl} quintals of ${decision.crop} to ${decision.bestMarketCode} at 6 AM, or sell half locally?`}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#F7F7F2] border border-[#D5D8D0] rounded-xl text-[#161A18] placeholder:text-[#7A827C] focus:outline-none focus:bg-white focus:border-[#0F2F1E] resize-none"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0F2F1E] rounded-xl hover:bg-[#16422B] disabled:opacity-60 transition-colors whitespace-nowrap"
                >
                  <Send className="w-4 h-4" />
                  <span>{isLoading ? 'Consulting AI Advisor...' : 'Ask AI Advisor'}</span>
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-[#E2E4DD]">
                <p className="text-xs font-semibold text-[#4A524D] mb-2.5">
                  Quick Farmer Decision Scenarios
                </p>
                <div className="space-y-2">
                  {quickQuestions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      disabled={isLoading}
                      onClick={() => {
                        setQuestionInput(q);
                        void runAdvisorQuery(q);
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-xs font-medium text-[#161A18] bg-[#F7F7F2] hover:bg-[#EFEFE8] border border-[#E2E4DD] rounded-xl transition-colors disabled:opacity-60"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Structured AI Decision Output */}
          <div className="lg:col-span-7 bg-white border border-[#E2E4DD] rounded-2xl p-6 sm:p-7 flex flex-col justify-between">
            {isLoading ? (
              <div className="space-y-4 py-4" aria-live="polite">
                <div className="h-4 w-48 bg-[#EFEFE8] rounded animate-pulse" />
                <div className="h-7 w-4/5 bg-[#EFEFE8] rounded animate-pulse" />
                <div className="h-16 w-full bg-[#F7F7F2] rounded-xl animate-pulse" />
                <div className="space-y-2.5 pt-2">
                  <div className="h-12 w-full bg-[#F7F7F2] rounded-xl animate-pulse" />
                  <div className="h-12 w-full bg-[#F7F7F2] rounded-xl animate-pulse" />
                  <div className="h-12 w-full bg-[#F7F7F2] rounded-xl animate-pulse" />
                </div>
              </div>
            ) : (
              <div>
                {errorMsg && (
                  <div
                    role="alert"
                    className="mb-4 p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs font-medium text-[#991B1B]"
                  >
                    {errorMsg}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#E2E4DD]">
                  <span className="text-xs font-semibold text-[#15803D] truncate max-w-md">
                    {advice ? 'Live Gemini Advisory Response' : 'Instant Smart Advisory Brief'} ·{' '}
                    {activeQuestionLabel}
                  </span>
                  <span className="font-mono tabular-nums text-xs font-bold text-[#0F2F1E]">
                    AI Confidence: {displayedAdvice.confidenceScore}%
                  </span>
                </div>

                <h3 className="mt-4 font-display text-xl sm:text-2xl font-bold text-[#0F2F1E]">
                  {displayedAdvice.headlineDecision}
                </h3>

                <p className="mt-2.5 text-sm text-[#3F4742] leading-relaxed">
                  {displayedAdvice.summaryExplanation}
                </p>

                {/* Numbered Key Reasons */}
                <div className="mt-5 space-y-2.5">
                  {displayedAdvice.keyReasons.slice(0, 3).map((item, index) => (
                    <div
                      key={index}
                      className="p-3.5 rounded-xl bg-[#F7F7F2] border border-[#E2E4DD] text-xs sm:text-sm text-[#161A18] flex items-start gap-3"
                    >
                      <span className="font-mono tabular-nums font-bold text-[#15803D] shrink-0">
                        0{index + 1}.
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                {/* Timing Recommendation */}
                <div className="mt-5 p-3.5 rounded-xl bg-[#FEF7E6] border border-[#F59E0B]/40 text-xs sm:text-sm text-[#78350F]">
                  <strong className="font-semibold text-[#92400E]">Optimal Dispatch Window: </strong>
                  <span>{displayedAdvice.timingRecommendation}</span>
                </div>

                {/* Genuine Risk Warning (Red strictly when warning exists) */}
                {displayedAdvice.riskWarning && (
                  <div className="mt-3.5 p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-2.5 text-xs sm:text-sm text-[#7F1D1D]">
                    <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                    <span>{displayedAdvice.riskWarning}</span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-[#E2E4DD] flex flex-wrap items-center justify-between gap-3 text-xs text-[#4A524D]">
              <span>All calculations factor road freight, market fees &amp; price variance</span>
              <a
                href="#reports"
                className="font-semibold text-[#0F2F1E] hover:underline underline-offset-4 whitespace-nowrap"
              >
                Export Decision Slip →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
