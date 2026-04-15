import { runAI } from "./aiserver";
import { ROXTOR_SYSTEM_INSTRUCTIONS } from "../constants/systemInstructions";

export async function inventoryAI(data: any, image?: string) {
  try {
    const systemPrompt = `
      ${ROXTOR_SYSTEM_INSTRUCTIONS}
      Eres el Especialista en INVENTARIO de ROXTOR. 
      Tu misión es analizar documentos (PDF, Imágenes, Excel) y extraer datos de productos, costos y stock.
      
      REGLAS DE EXTRACCIÓN:
      1. Extrae el nombre en MAYÚSCULAS.
      2. Identifica la tela/material (Lino, Algodón, Microdurazno, etc.).
      3. Captura precios DETAL (priceRetail) y MAYOR (priceWholesale).
      4. Identifica el ÁREA O USO DIRIGIDO (targetAreas).
      5. REGLA CRÍTICA: Busca "Recargos Especiales" (additionalConsiderations) como: costos por tallas plus, cargos de diseño, o digitalización.
      
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

    // Usamos gemini-1.5-flash para análisis de documentos y fotos
    const result = await runAI(prompt, systemPrompt, image);

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
