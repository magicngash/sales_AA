type NetlifyEvent = {
  path?: string;
  body?: string | null;
};

type NetlifyContext = Record<string, unknown>;

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

function transient(status: number, message: string) {
  const lower = message.toLowerCase();
  return status === 429 || status >= 500 || lower.includes("rate limit") || lower.includes("overloaded");
}

async function askDeepSeek(systemInstruction: string, prompt: string, temperature: number, jsonMode = false) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY is not configured in Netlify environment variables.");

  const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  let lastError = "DeepSeek request failed.";

  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt },
        ],
        temperature,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (response.ok) return payload?.choices?.[0]?.message?.content || "";

    lastError = payload?.error?.message || `DeepSeek request failed (${response.status}).`;
    if (!transient(response.status, lastError) || attempt === 2) throw new Error(lastError);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(lastError);
}

const qaSystem = `You are an elite Sales Analytics & Inventory Intelligence Specialist.
Answer questions about sales recorded in Google Sheets with extreme precision. Base answers on the provided data, cite explicit numbers and products, explain inventory implications, state what is missing, and use clean markdown.`;

const reportSystem = `You are a Chief Operations & Revenue Officer specializing in retail, e-commerce, and wholesale supply chain intelligence.
Generate a professional markdown Executive Sales & Inventory Management Report with: executive summary, product and category trajectory, inventory velocity and stockout risks, immediate reorder list, safety stock adjustments, clearance strategy, and working-capital recommendations.`;

const inventorySystem = `You are an AI supply chain planner. Analyze sales trends and stock levels and return valid JSON only using this schema:
{"summary":"string","criticalAlertsCount":0,"actionItems":[{"id":"string","sku":"string","productName":"string","category":"string","urgency":"critical|warning|opportunity|good","issue":"string","recommendation":"string","currentStock":0,"dailyRunRate":0,"daysRemaining":0,"suggestedOrderQty":0,"estimatedCost":0}],"strategicTips":["string"]}
Make all numbers realistic and mathematically derived from the supplied data.`;

export async function handler(event: NetlifyEvent, _context: NetlifyContext) {
  try {
    const route = (event.path || "").split("/").filter(Boolean).pop();
    const body = event.body ? JSON.parse(event.body) : {};

    if (route === "ask-sales") {
      if (!body.question) return json(400, { error: "Question is required" });
      const prompt = `User Question: "${body.question}"\n\nSales & Inventory Data Context:\nOverall Summary:\n${JSON.stringify(body.datasetSummary, null, 2)}\n\nInventory Health & Stock Status:\n${JSON.stringify(body.inventoryStatus, null, 2)}\n\nSample/Filtered Records:\n${JSON.stringify(body.sampleRows, null, 2)}\n\nProvide a comprehensive, accurate, actionable answer.`;
      return json(200, { answer: await askDeepSeek(qaSystem, prompt, 0.2) });
    }

    if (route === "generate-report") {
      const prompt = `Generate an executive report from this dataset. Scope: ${body.reportScope || "Full Period"}\n\nSummary:\n${JSON.stringify(body.datasetSummary, null, 2)}\n\nTop Products:\n${JSON.stringify(body.topPerformers, null, 2)}\n\nCategories:\n${JSON.stringify(body.categoryBreakdown, null, 2)}\n\nInventory Risks:\n${JSON.stringify(body.inventoryRisks, null, 2)}`;
      return json(200, { markdownReport: await askDeepSeek(reportSystem, prompt, 0.3), generatedAt: new Date().toISOString() });
    }

    if (route === "inventory-insights") {
      const prompt = `Analyze this sales and inventory data and return the requested JSON.\nProducts and Stock:\n${JSON.stringify(body.inventoryData, null, 2)}\nRecent Sales Velocities:\n${JSON.stringify(body.salesTrends, null, 2)}`;
      const result = await askDeepSeek(inventorySystem, prompt, 0.1, true);
      return json(200, JSON.parse(result.replace(/^```json\s*/i, "").replace(/```$/, "").trim() || "{}"));
    }

    return json(404, { error: "Unknown DeepSeek endpoint" });
  } catch (error: any) {
    console.error("DeepSeek function error:", error);
    return json(500, { error: error?.message || "DeepSeek request failed." });
  }
}
