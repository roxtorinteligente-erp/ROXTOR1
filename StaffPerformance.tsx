import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

/**
 * ROXTOR AI CORE ENGINE
 * Centralized motor for all AI operations in the ERP.
 * Optimized for @google/genai SDK.
 */

export async function runAI(
  prompt: string,
  systemInstruction: string,
  image?: string,
  mimeType: string = "image/jpeg"
) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing in environment variables");
    }

    // Inicialización específica para @google/genai
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // Usamos gemini-1.5-flash por defecto
    const selectedModel = "gemini-1.5-flash";
    
    const parts: any[] = [{ text: prompt }];

    if (image) {
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

      console.log(`[AI] Processing attachment: ${finalMimeType} (${base64Data.length} bytes)`);

      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: finalMimeType,
        },
      });
    }

    console.log(`[AI] Calling model: ${selectedModel} with prompt length: ${prompt.length}`);

    // Llamada a la API según el patrón de @google/genai
    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.1,
        topP: 0.95,
        topK: 64,
        responseMimeType: "application/json",
      },
    });

    if (!response) {
      throw new Error("La IA no devolvió ninguna respuesta.");
    }

    // En @google/genai, .text es una propiedad directa de la respuesta
    let text = (response as any).text || "";
    text = text.trim();

    if (!text) {
      console.warn("[AI] Response text is empty");
    }

    // Limpieza de bloques de código Markdown si el modelo los incluye
    text = text.replace(/```json\s?|```\s?/g, "").trim();

    // Parseo seguro de la respuesta
    try {
      return JSON.parse(text);
    } catch (e) {
      console.warn("⚠️ AI returned non-structured text, attempting to extract JSON block:", text.substring(0, 100));
      
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
    
    // Si es un error de cuota o de seguridad, lo especificamos
    let userMessage = "Lo siento, el Cerebro de Roxtor tiene una falla técnica. Intenta de nuevo. ⚡";
    if (error.message?.includes("429") || error.message?.includes("quota")) {
      userMessage = "Se ha alcanzado el límite de solicitudes de IA por hoy. Por favor, intenta más tarde.";
    } else if (error.message?.includes("400")) {
      userMessage = "Error en el formato del archivo o mensaje (400). Prueba con un archivo más pequeño o una imagen clara.";
    } else if (error.message?.includes("API_KEY")) {
      userMessage = "Error de configuración: Clave de API no válida o ausente.";
    }

    return { 
      error: "AI_ENGINE_FAILURE", 
      details: error.message,
      suggested_reply: userMessage
    };
  }
}
