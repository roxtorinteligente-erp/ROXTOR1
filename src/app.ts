import express from "express";
import dotenv from "dotenv";

// 🔥 IA MODULAR
import { radarAI } from "./ai/radar";
import { auditAI } from "./ai/audit";
import { inventoryAI } from "./ai/inventory";
import { reportAI } from "./ai/report";
import { detectModule } from "./ai/detectModule";
import { runAI } from "./ai/aiserver";

dotenv.config();

// 🔐 Helper seguro para URLs
function safeURL(url?: string) {
  try {
    if (!url) return null;
    if (!url.startsWith("http")) return null;
    return new URL(url);
  } catch {
    return null;
  }
}

const app = express();
app.use(express.json({ limit: "50mb" }));

// Router para agrupar endpoints de la API
const apiRouter = express.Router();

// 🔹 ROOT API
apiRouter.get("/", (req, res) => {
  res.json({
    message: "ROXTOR API",
    endpoints: ["/api/health", "/api/ai/test", "/api/ai/analyze"],
  });
});

// 🔹 HEALTH CHECK
apiRouter.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// 🔹 TEST IA
apiRouter.get("/ai/test", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "GEMINI_API_KEY no configurada",
      });
    }

    const result = await runAI(
      'Responde SOLO en JSON: {"ok": true}',
      "Responde siempre JSON puro"
    );

    res.json({ success: true, result });
  } catch (error: any) {
    console.error("AI TEST ERROR:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 🔹 ANALYZE (CORE IA)
apiRouter.post("/ai/analyze", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    const result = await radarAI(prompt);

    res.json(result);
  } catch (error: any) {
    console.error("ANALYZE ERROR:", error.message);
    res.status(500).json({
      error: "AI_ENGINE_FAILURE",
      details: error.message,
    });
  }
});

// 🔹 WEBHOOK WHATSAPP
apiRouter.get("/webhook", (req, res) => {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (
    req.query["hub.mode"] === "subscribe" &&
    req.query["hub.verify_token"] === verifyToken
  ) {
    return res.status(200).send(req.query["hub.challenge"]);
  }

  res.sendStatus(403);
});

apiRouter.post("/webhook", async (req, res) => {
  try {
    const message = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (message?.text?.body) {
      const text = message.text.body;
      const from = message.from;

      const ai = await radarAI(text);

      if (ai?.suggested_reply) {
        const url = safeURL(
          `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`
        );

        if (!url) {
          console.error("URL inválida WhatsApp");
          return res.sendStatus(200);
        }

        await fetch(url.toString(), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: from,
            type: "text",
            text: { body: ai.suggested_reply },
          }),
        });
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("WEBHOOK ERROR:", error);
    res.sendStatus(500);
  }
});

// Montar el router en /api para compatibilidad local
app.use("/api", apiRouter);

// Montar el router en / para compatibilidad con el redirect de Netlify (:splat)
// Solo si estamos en Netlify para no interferir con el frontend en desarrollo local
if (process.env.NETLIFY) {
  app.use("/", apiRouter);
}

// 🔹 404 API HANDLER
// Solo responde con JSON si es una ruta de API o estamos en Netlify
app.use((req, res, next) => {
  if (req.path.startsWith("/api") || process.env.NETLIFY) {
    res.status(404).json({ error: "API endpoint not found", path: req.path });
  } else {
    next();
  }
});

export default app;
