import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// Lazy initializer for Gemini SDK
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

// Resilient Gemini content generation with exponential backoff and automatic model failover
const PRIMARY_MODEL = "gemini-3.8-flash";
const FALLBACK_MODELS = ["gemini-3.1-flash-lite", "gemini-flash-latest"];

function isTransientDemandError(error: any): boolean {
  if (!error) return false;
  const status = error?.status || error?.code || (error?.error && error.error.code);
  const msg = (error?.message || String(error)).toLowerCase();

  return (
    status === 503 ||
    status === 429 ||
    status === "UNAVAILABLE" ||
    status === "RESOURCE_EXHAUSTED" ||
    msg.includes("503") ||
    msg.includes("429") ||
    msg.includes("high demand") ||
    msg.includes("overloaded") ||
    msg.includes("spikes in demand") ||
    msg.includes("temporarily unavailable") ||
    msg.includes("resource has been exhausted") ||
    msg.includes("rate limit")
  );
}

function cleanErrorMessage(error: any): string {
  if (!error) return "An unexpected error occurred while communicating with Gemini.";
  const raw = error.message || String(error);
  try {
    const jsonMatch = raw.match(/\{[\s\S]*"message"\s*:\s*"([^"]+)"[\s\S]*\}/);
    if (jsonMatch && jsonMatch[1]) {
      return jsonMatch[1];
    }
  } catch {
    // ignore
  }
  return raw;
}

async function generateContentWithResilience(
  ai: GoogleGenAI,
  options: {
    contents: any;
    config?: any;
  }
) {
  const models = [PRIMARY_MODEL, ...FALLBACK_MODELS];
  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: options.contents,
          config: options.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const transient = isTransientDemandError(err);
        console.warn(`[Gemini] Model ${model} (attempt ${attempt}/2) failed:`, err?.message || err);

        if (!transient) {
          // If the error is fatal / not transient (e.g. invalid arguments), fail immediately
          throw err;
        }

        if (attempt < 2) {
          const delay = attempt * 1000 + Math.floor(Math.random() * 400);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    console.warn(`[Gemini] Model ${model} unavailable or under high demand. Attempting fallback model...`);
  }

  throw lastError;
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Q&A endpoint for sales and inventory questions
app.post("/api/gemini/ask-sales", async (req, res) => {
  try {
    const { question, datasetSummary, sampleRows, inventoryStatus } = req.body;
    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    const ai = getAI();
    const systemInstruction = `You are an elite Sales Analytics & Inventory Intelligence Specialist.
Your job is to answer questions about sales recorded in Google Sheets and explain their impact on inventory management with extreme precision.

When answering:
1. Always base your answers directly on the provided data context (summary metrics, trends, and row records).
2. Cite explicit numbers, revenue amounts, quantities sold, dates, and SKU/Product names whenever possible.
3. If the user asks about sales trends, also highlight the direct implications for stock levels, lead times, or inventory risk (e.g. accelerating burn rate = urgent reorder).
4. If the data does not contain enough information to answer definitively, state what is known and clarify what is missing.
5. Format your answer with clean markdown, using bold highlights and bullet points for readability.`;

    const prompt = `User Question: "${question}"

Sales & Inventory Data Context:
Overall Summary:
${JSON.stringify(datasetSummary, null, 2)}

Inventory Health & Stock Status:
${JSON.stringify(inventoryStatus, null, 2)}

Sample/Filtered Records:
${JSON.stringify(sampleRows, null, 2)}

Please provide a comprehensive, accurate, and actionable answer.`;

    const response = await generateContentWithResilience(ai, {
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    res.json({ answer: response.text || "No response generated." });
  } catch (error: any) {
    console.error("Error answering sales question:", error);
    const friendlyMessage = cleanErrorMessage(error);
    res.status(500).json({ error: friendlyMessage });
  }
});

// Automated Summary Report generation
app.post("/api/gemini/generate-report", async (req, res) => {
  try {
    const { datasetSummary, topPerformers, categoryBreakdown, inventoryRisks, reportScope } = req.body;

    const ai = getAI();
    const systemInstruction = `You are a Chief Operations & Revenue Officer specializing in retail, e-commerce, and wholesale supply chain intelligence.
Generate a structured, professional Executive Sales & Inventory Management Report.

The report MUST include:
# 📊 Executive Sales & Inventory Performance Report
## 1. Executive Summary & Revenue Highlights
Concise overview of total revenue, units moved, average order value, and profit margins.

## 2. Product & Category Trajectory
In-depth analysis of top revenue generators vs lagging items. Pinpoint customer demand shifts.

## 3. Inventory Velocity & Stockout Risk Projections
Analyze sales run-rates against stock on hand. Identify items with imminent stockout risk (Days of Stock < Lead Time) and dead inventory tying up capital.

## 4. Actionable Inventory Management Strategy
Concrete instructions:
- Immediate Reorder List (specific SKUs and replenishment urgency)
- Safety Stock Adjustments for surge products
- Clearance / Liquidation strategy for dormant SKUs
- Working capital optimization tips

Use clear markdown headers, bold key figures, and concise bullet points.`;

    const prompt = `Generate an executive sales and inventory summary report based on this live Google Sheets dataset:

Scope: ${reportScope || "Full Period"}

Summary Statistics:
${JSON.stringify(datasetSummary, null, 2)}

Top Performing Products:
${JSON.stringify(topPerformers, null, 2)}

Category Breakdown:
${JSON.stringify(categoryBreakdown, null, 2)}

Inventory Health & Stockout Alerts:
${JSON.stringify(inventoryRisks, null, 2)}
`;

    const response = await generateContentWithResilience(ai, {
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    res.json({
      markdownReport: response.text || "Report generation incomplete.",
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error generating summary report:", error);
    const friendlyMessage = cleanErrorMessage(error);
    res.status(500).json({ error: friendlyMessage });
  }
});

// Actionable Inventory Insights generation (Structured JSON)
app.post("/api/gemini/inventory-insights", async (req, res) => {
  try {
    const { inventoryData, salesTrends } = req.body;

    const ai = getAI();
    const systemInstruction = `You are an AI supply chain planner.
Analyze the provided product sales trends and stock levels to generate prioritized, highly actionable inventory recommendations.

Return a valid JSON object matching this schema:
{
  "summary": "Brief 1-2 sentence overall health summary",
  "criticalAlertsCount": number,
  "actionItems": [
    {
      "id": "string",
      "sku": "string",
      "productName": "string",
      "category": "string",
      "urgency": "critical" | "warning" | "opportunity" | "good",
      "issue": "Specific explanation of current state (e.g., Stock out in 4 days at current sales pace)",
      "recommendation": "Concrete action (e.g., Expedite purchase order of 150 units from Supplier)",
      "currentStock": number,
      "dailyRunRate": number,
      "daysRemaining": number,
      "suggestedOrderQty": number,
      "estimatedCost": number
    }
  ],
  "strategicTips": [
    "Tip 1...",
    "Tip 2...",
    "Tip 3..."
  ]
}

Ensure all numbers are realistic and mathematically derived from the sales velocity.`;

    const prompt = `Analyze this sales and inventory dataset:
Products and Stock:
${JSON.stringify(inventoryData, null, 2)}

Recent Sales Velocities:
${JSON.stringify(salesTrends, null, 2)}
`;

    const response = await generateContentWithResilience(ai, {
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    let rawText = response.text || "{}";
    // Strip markdown code fences if present
    rawText = rawText.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(rawText || "{}");
    res.json(parsed);
  } catch (error: any) {
    console.error("Error generating inventory insights:", error);
    const friendlyMessage = cleanErrorMessage(error);
    res.status(500).json({ error: friendlyMessage });
  }
});

// Vite / Static setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
