import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

/**
 * ROXTOR AI CORE ENGINE
 * Centralized motor for all AI operations in the ERP.
 * Optimized for @google/genai SDK and Netlify Functions.
 */

export async function runAI(
  prompt: string,
  systemInstruction: string,
  image?: string,
  mimeType: string = "image/jpeg",
  modelName: string = "gemini-flash-latest"
) {
  try {
    // Inicialización según estándar @google/genai
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const parts: any[] = [{ text: prompt }];

    // Si es un PDF o el prompt es muy largo, usamos un modelo Pro
    let selectedModel = modelName;
    if (mimeType === "application/pdf" || prompt.length > 2000) {
      selectedModel = "gemini-3.1-pro-preview";
    }

    if (image) {
      console.log(`[AI] Processing attachment: ${mimeType} (${image.length} bytes)`);
      // Limpieza de base64 si viene con el prefijo data:image/...
      const base64Data = image.includes("base64,") 
        ? image.split("base64,")[1] 
        : image;
      
      // Detección dinámica de mimeType
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

    console.log(`[AI] Calling model: ${selectedModel}`);

    // Llamada a la API moderna de Google GenAI
    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: { parts },
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.1, // Precisión máxima para JSON
        topP: 0.95,
        topK: 64,
        responseMimeType: "application/json",
      },
    });

    // En @google/genai, .text es una propiedad, no un método
    let text = response.text || "";
    text = text.trim();

    // Limpieza de bloques de código Markdown si el modelo los incluye
    text = text.replace(/```json\s?|```\s?/g, "").trim();

    // Parseo seguro de la respuesta
    try {
      return JSON.parse(text);
    } catch (e) {
      console.warn("⚠️ AI returned non-structured text, attempting to extract JSON block:", text);
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (innerError) {
          console.error("❌ Failed to parse extracted JSON block");
        }
      }

      // Fallback para no romper el flujo del ERP
      return { suggested_reply: text, raw: text };
    }
  } catch (error: any) {
    console.error("🚨 ROXTOR AI CORE ERROR:", error.message);
    // Retornamos error estructurado para que los módulos lo propaguen
    return { 
      error: "AI_ENGINE_FAILURE", 
      details: error.message,
      suggested_reply: "Lo siento, el Cerebro de Roxtor tiene una falla técnica. Intenta de nuevo. ⚡"
    };
  }
}
