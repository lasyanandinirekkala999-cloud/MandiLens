import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  app.post('/api/ai/selling-advice', async (req, res) => {
    try {
      const {
        location = 'Anantapur, Andhra Pradesh',
        crop = 'Tomato',
        quantityQtl = 20,
        bestMarketName = 'Mandi A',
        bestNetProfit = 43200,
        extraEarnings = 8400,
        marketsSummary = [],
        farmerQuestion = '',
      } = req.body ?? {};

      const ai = getGeminiClient();

      const prompt = [
        `Farmer Context:`,
        `- Origin Location: ${String(location).slice(0, 100)}`,
        `- Crop: ${String(crop).slice(0, 60)}`,
        `- Harvest Lot Quantity: ${Number(quantityQtl) || 20} Quintals`,
        `- Top Recommended Market: ${String(bestMarketName).slice(0, 80)}`,
        `- Estimated Net Profit at Top Market: INR ${Number(bestNetProfit) || 43200}`,
        `- Potential Extra Earnings vs Local Baseline: +INR ${Number(extraEarnings) || 8400}`,
        `- Evaluated Markets Data: ${JSON.stringify(marketsSummary).slice(0, 2500)}`,
        farmerQuestion
          ? `- Specific Farmer Question: "${String(farmerQuestion).slice(0, 300)}"`
          : `- Task: Explain clearly why ${bestMarketName} is the smartest selling choice right now, how to time the dispatch, and any transit or price-variation risk to watch.`,
      ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'You are MandILens AI Advisor, an agricultural market intelligence economist for Indian farmers and FPOs. ' +
            'Give practical, transparent, numbers-backed selling decisions focused on NET profit after transport, market fees, and expected price/spoilage variation. ' +
            'Keep sentences crisp, concrete, and jargon-free. Return valid JSON matching the schema.',
          temperature: 0.35,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headlineDecision: {
                type: Type.STRING,
                description: 'Direct 1-sentence recommendation telling the farmer where and how to sell.',
              },
              summaryExplanation: {
                type: Type.STRING,
                description: '2-3 concise sentences answering the farmer question with concrete rupee or percentage reasoning.',
              },
              keyReasons: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Exactly 3 short bullet points explaining net profit, transport efficiency, and demand/arrival dynamics.',
              },
              timingRecommendation: {
                type: Type.STRING,
                description: 'Specific gate-entry window or sell-now vs hold recommendation.',
              },
              riskWarning: {
                type: Type.STRING,
                description: 'Specific warning on spoilage, moisture, crate grading, or distant-haul risk (or empty string if minimal).',
              },
              confidenceScore: {
                type: Type.INTEGER,
                description: 'Confidence percentage integer between 82 and 97.',
              },
            },
            required: [
              'headlineDecision',
              'summaryExplanation',
              'keyReasons',
              'timingRecommendation',
              'riskWarning',
              'confidenceScore',
            ],
          },
        },
      });

      const rawText = response.text;
      if (!rawText) {
        res.status(502).json({ error: 'Empty response from AI market advisor.' });
        return;
      }

      const parsed = JSON.parse(rawText.trim());
      res.json(parsed);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to generate AI market recommendation.';
      console.error('AI Advisor Error:', message);
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MandILens server running on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
