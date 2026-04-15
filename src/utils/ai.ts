import { GoogleGenAI } from "@google/genai";
import { ROXTOR_SYSTEM_INSTRUCTIONS } from "../constants/systemInstructions";

/**
 * ROXTOR AI FRONTEND ENGINE
 * This file handles AI calls directly from the browser as per Gemini API guidelines.
 */

let aiInstance: GoogleGenAI | null = null;

export const getGeminiApiKey = () => {
  return (process.env.GEMINI_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY || "");
};

const getAI = () => {
  if (!aiInstance) {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      console.warn("⚠️ GEMINI_API_KEY not found in frontend environment.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

/**
 * Core function to run AI from the frontend
 */
export const runAIFrontend = async (
  prompt: string,
  systemInstruction: string,
  image?: string,
  mimeType: string = "image/jpeg"
) => {
  try {
    const ai = getAI();
    const modelName = "gemini-3-flash-preview";
    
    const parts: any[] = [{ text: prompt }];

    if (image) {
      const base64Data = image.includes("base64,") 
        ? image.split("base64,")[1] 
        : image;
      
      let finalMimeType = mimeType;
      if (image.startsWith("data:")) {
        const match = image.match(/^data:([^;]+);base64,/);
        if (match) finalMimeType = match[1];
      }

      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: finalMimeType,
        },
      });
    }

    console.log(`[AI-Frontend] Calling ${modelName}...`);

    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts },
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.1,
        topP: 0.95,
        topK: 64,
        responseMimeType: "application/json",
      },
    });

    if (!response || !response.text) {
      throw new Error("La IA no devolvió ninguna respuesta válida.");
    }

    let text = response.text.trim();
    text = text.replace(/```json\s?|```\s?/g, "").trim();

    try {
      return JSON.parse(text);
    } catch (e) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return { suggested_reply: text, raw: text };
    }
  } catch (error: any) {
    console.error("🚨 ROXTOR AI FRONTEND ERROR:", error);
    return {
      error: "AI_ENGINE_FAILURE",
      details: error.message,
      suggested_reply: "Lo siento, el Cerebro de Roxtor tiene una falla técnica. Intenta de nuevo. ⚡"
    };
  }
};

/**
 * Specialized module calls (Frontend versions)
 */

export const radarAIFrontend = async (message: string, image?: string, catalog?: any[]) => {
  const catalogContext = catalog 
    ? `CATÁLOGO MAESTRO (Usa estos precios):\n${JSON.stringify(catalog.map(p => ({ name: p.name, price: p.priceRetail, material: p.material })))}` 
    : 'No hay catálogo disponible, usa precios estándar de la industria.';

  const systemPrompt = `
    ${ROXTOR_SYSTEM_INSTRUCTIONS}
    Eres el RADAR de ROXTOR ERP. Tu misión es detectar la intención del usuario y extraer entidades.
    ${catalogContext}
    RESPONDE SIEMPRE EN ESTE FORMATO JSON:
    {
      "module": "radar | inventory | audit | report",
      "action": "COTIZAR | CREAR_ORDEN | VALIDAR_PAGO | CONSULTA | DISEÑO | OTRO",
      "confidence": 0.0-1.0,
      "entities": {
        "customer_name": "string",
        "customer_phone": "string",
        "items": [{ "name": "string", "quantity": number, "priceUsd": number }],
        "total_amount": number,
        "urgent": boolean
      },
      "suggested_reply": "Respuesta profesional, corta y con upsell"
    }
  `;

  return await runAIFrontend(`Analiza el siguiente mensaje: "${message}"`, systemPrompt, image);
};

export const inventoryAIFrontend = async (data: any, image?: string) => {
  const systemPrompt = `
    ${ROXTOR_SYSTEM_INSTRUCTIONS}
    Eres el Especialista en INVENTARIO de ROXTOR. 
    Tu misión es analizar documentos (PDF, Imágenes, Excel) y extraer datos de productos, costos y stock.
    RESPONDE SIEMPRE EN ESTE FORMATO JSON:
    {
      "module": "inventory",
      "action": "UPDATE_STOCK | ADD_PRODUCT | COST_ANALYSIS",
      "items": [
        {
          "name": "NOMBRE",
          "priceRetail": 0.0,
          "priceWholesale": 0.0,
          "material": "TELA",
          "targetAreas": "ÁREA O USO",
          "additionalConsiderations": "RECARGOS",
          "description": "NOTAS"
        }
      ],
      "extracted_data": {
        "supplier": "string",
        "total_invoice": number
      },
      "analysis": "Análisis técnico de los datos extraídos",
      "suggested_reply": "Respuesta profesional"
    }
  `;

  const prompt = typeof data === 'string' ? data : "Analiza este documento de inventario y extrae la información relevante.";
  return await runAIFrontend(prompt, systemPrompt, image);
};

export const auditAIFrontend = async (data: any, image?: string) => {
  const systemPrompt = `
    ${ROXTOR_SYSTEM_INSTRUCTIONS}
    Eres el CFO y Auditor de ROXTOR. Tu misión es analizar finanzas, detectar ineficiencias y optimizar el rendimiento.
    RESPONDE SIEMPRE EN ESTE FORMATO JSON:
    {
      "module": "audit",
      "status": "Óptimo | Alerta | Crítico",
      "analysis": "Desglose técnico de los números",
      "questioning": "Pregunta provocadora sobre una decisión financiera",
      "improvement_action": "Recomendación técnica concreta",
      "metrics": {
        "cash_flow_health": 0-100,
        "margin_risk": "Bajo | Medio | Alto"
      },
      "suggested_reply": "Resumen ejecutivo para la gerencia"
    }
  `;
  const prompt = typeof data === 'string' ? data : `Analiza estos datos financieros: ${JSON.stringify(data)}`;
  return await runAIFrontend(prompt, systemPrompt, image);
};

export const reportAIFrontend = async (data: any, image?: string) => {
  const systemPrompt = `
    ${ROXTOR_SYSTEM_INSTRUCTIONS}
    Eres el Especialista en REPORTES de ROXTOR. Tu misión es generar métricas, análisis globales y KPIs.
    RESPONDE SIEMPRE EN ESTE FORMATO JSON:
    {
      "module": "report",
      "kpis": {
        "sales_growth": "string",
        "profitability_index": number,
        "production_efficiency": number
      },
      "analysis": "Análisis global de la situación",
      "recommendations": ["string"],
      "suggested_reply": "Resumen ejecutivo para la gerencia"
    }
  `;
  const prompt = typeof data === 'string' ? data : `Genera un reporte basado en estos datos: ${JSON.stringify(data)}`;
  return await runAIFrontend(prompt, systemPrompt, image);
};

/**
 * Main Bridge for the App
 */
export const callRoxtorAI = async (prompt: string, image?: string, options: any = {}) => {
  const module = options.module || 'radar';
  
  console.log(`[AI-Bridge] Routing to ${module} (Frontend Mode)`);
  
  if (module === 'inventory') {
    return await inventoryAIFrontend(prompt, image);
  } else if (module === 'audit') {
    return await auditAIFrontend(prompt, image);
  } else if (module === 'report') {
    return await reportAIFrontend(prompt, image);
  } else {
    return await radarAIFrontend(prompt, image, options.catalog);
  }
};

export const callAI = async (prompt: string, options: any = {}) => {
  const result = await callRoxtorAI(prompt, undefined, options);
  return result.suggested_reply || result;
};

export const generateWithAI = callRoxtorAI;
