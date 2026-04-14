import path from "path";
import express from "express";
import { createServer as createViteServer } from "vite";
import app from "./src/app";

const PORT = 3000;

async function startDevServer() {
  // Solo para desarrollo local (tsx server.ts)
  if (process.env.NODE_ENV !== "production" && !process.env.NETLIFY) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    // Usar el middleware de vite para manejar el frontend
    // Importante: Esto debe ir DESPUÉS de las rutas de la API si queremos que la API tenga prioridad
    // Pero en este caso app ya tiene las rutas de la API montadas.
    app.use(vite.middlewares);

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Local dev server running on http://localhost:${PORT}`);
      console.log(`📡 API Health check: http://localhost:${PORT}/api/health`);
    });
  }
}

startDevServer();

export { app };
