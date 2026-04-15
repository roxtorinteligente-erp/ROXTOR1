import { runAI } from "./aiserver";
import { ROXTOR_SYSTEM_INSTRUCTIONS } from "../constants/systemInstructions";

export async function inventoryAI(data: any, image?: string) {
  try {
    const systemPrompt = `
      ${ROXTOR_SYSTEM_INSTRUCTIONS}
      Eres el Especialista en INVENTARIO de ROXTOR. 
      Tu misión es analizar documentos (PDF, Imágenes, Excel) y extraer datos de productos, costos y stock.
      
      Si el usuario solicita un formato específico (como una lista de "items"), PRIORIZA ese formato.
      De lo contrario, responde en este formato JSON:
      {
        "module": "inventory",
        "action": "UPDATE_STOCK | ADD_PRODUCT | COST_ANALYSIS",
        "extracted_data": {
          "items": [{ "name": "string", "sku": "string", "cost": number, "price": number, "quantity": number }],
          "supplier": "string",
          "total_invoice": number
        },
        "analysis": "Análisis técnico de los datos extraídos",
        "suggested_reply": "Respuesta profesional"
      }
    `;

    const prompt = typeof data === 'string' ? data : "Analiza este documento de inventario y extrae la información relevante.";

    // Usamos gemini-3.1-pro-preview para análisis de documentos complejos (PDFs)
    const result = await runAI(prompt, systemPrompt, image, "application/pdf");

    return result;

  } catch (error: any) {
    console.error("inventoryAI Error:", error);
    return {
      module: "inventory",
      action: "ERROR",
      suggested_reply: "Error al procesar el documento de inventario. Asegúrate de que el archivo sea legible."
    };
  }
}
