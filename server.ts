import path from "path";
import express from "express";
import { createServer as createViteServer } from "vite";
import app from "./src/app";

const PORT = 3000;

async function startServer() {
  // Middleware de Vite para desarrollo
  if (process.env.NODE_ENV !== "production" && !process.env.NETLIFY) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    // Usar el middleware de vite para manejar el frontend
    app.use(vite.middlewares);
  } else {
    // Modo Producción: Servir archivos estáticos desde dist
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    // Fallback para SPA (manejar rutas de React)
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer();

export { app };
