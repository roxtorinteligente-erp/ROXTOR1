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
  res.json({ 
    status: "ok", 
    time: new Date().toISOString(),
    version: "1.0.6-genai-stable-20260414",
    engine: "google-genai-v1",
    build_time: "2026-04-14T23:18:00Z"
  });
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
      error: "AI_ENGINE_FAILURE",
      details: error.message
    });
  }
});

// 🔹 ANALYZE (CORE IA)
apiRouter.get(["/ai/analyze", "/ai/analize"], (req, res) => {
  res.json({ 
    message: "ROXTOR ANALYZE ENDPOINT", 
    status: "active",
    note: "Este endpoint requiere una petición POST con un prompt en el cuerpo."
  });
});

apiRouter.post(["/ai/analyze", "/ai/analize"], async (req, res) => {
  try {
    const { prompt, image, catalog, module } = req.body;

    console.log(`[API] Analyze request - Module: ${module || 'radar'} - Has Image: ${!!image}`);

    if (!prompt) {
      console.warn("[API] Missing prompt in request body");
      return res.status(400).json({ 
        error: "Missing prompt",
        suggestion: "Asegúrate de enviar un campo 'prompt' en el cuerpo de la petición."
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("[API] GEMINI_API_KEY is not configured");
      return res.status(500).json({
        error: "CONFIGURATION_ERROR",
        details: "La clave de API de Gemini no está configurada en el servidor."
      });
    }

    // Si se especifica un módulo, usamos el correspondiente
    let result;
    try {
      if (module === 'audit') {
        result = await auditAI(prompt, image);
      } else if (module === 'inventory') {
        result = await inventoryAI(prompt, image);
      } else if (module === 'report') {
        result = await reportAI(prompt, image);
      } else {
        // Por defecto usamos radarAI
        result = await radarAI(prompt, image, catalog);
      }
    } catch (aiError: any) {
      console.error(`[API] AI Module Error (${module || 'radar'}):`, aiError.message);
      return res.status(500).json({
        error: "AI_MODULE_CRASH",
        details: aiError.message,
        suggested_reply: "Hubo un error crítico procesando tu solicitud. Por favor, intenta de nuevo."
      });
    }

    if (result?.error === "AI_ENGINE_FAILURE") {
      console.warn("[API] AI Engine returned failure:", result.details);
      // Si el motor de IA falló (ej: 400 de Gemini), devolvemos un 400 o 500 según corresponda
      const status = result.details?.includes("400") ? 400 : 500;
      return res.status(status).json(result);
    }

    res.json(result);
  } catch (error: any) {
    console.error("ANALYZE GLOBAL ERROR:", error.message);
    res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      details: error.message,
    });
  }
});

// 🔹 RADAR (COMPATIBILIDAD)
apiRouter.post("/ai/radar", async (req, res) => {
  try {
    const { message, image, catalog } = req.body;
    const result = await radarAI(message || "", image, catalog);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: "AI_ENGINE_FAILURE", details: error.message });
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

      if (ai?.suggested_reply || ai?.entities?.meta_template) {
        const url = safeURL(
          `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`
        );

        if (!url) {
          console.error("URL inválida WhatsApp");
          return res.sendStatus(200);
        }

        const payload: any = {
          messaging_product: "whatsapp",
          to: from,
        };

        if (ai.entities?.meta_template?.name) {
          payload.type = "template";
          payload.template = {
            name: ai.entities.meta_template.name,
            language: { code: ai.entities.meta_template.language || "es" },
            components: ai.entities.meta_template.components || []
          };
        } else {
          payload.type = "text";
          payload.text = { body: ai.suggested_reply };
        }

        await fetch(url.toString(), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("WEBHOOK ERROR:", error);
    res.sendStatus(500);
  }
});

// Montar el router en ambos prefijos para máxima compatibilidad con redirects
app.use("/api", apiRouter);
app.use("/", apiRouter);

// 🔹 404 API HANDLER
app.use((req, res, next) => {
  if (req.path.startsWith("/api") || req.path.includes("/ai/")) {
    res.status(404).json({ 
      error: "API endpoint not found", 
      path: req.path,
      method: req.method,
      suggestion: "Verifica que el método (GET/POST) y la ruta sean correctos."
    });
  } else {
    next();
  }
});

export default app;
