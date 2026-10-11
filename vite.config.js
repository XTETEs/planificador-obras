import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function dictadoPlugin() {
  return {
    name: 'dictado-api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/dictado' || req.url.startsWith('/api/dictado?')) {
          try {
            const env = loadEnv('development', process.cwd(), '');
            if (env.GEMINI_API_KEY) process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
            if (env.GEMINI_MODEL) process.env.GEMINI_MODEL = env.GEMINI_MODEL;
            if (!process.env.GEMINI_MODEL) process.env.GEMINI_MODEL = 'gemini-2.0-flash';

            const { default: handler } = await import('./api/dictado.js');
            let bodyStr = '';
            req.on('data', (chunk) => { bodyStr += chunk; });
            req.on('end', async () => {
              let body = {};
              try { if (bodyStr) body = JSON.parse(bodyStr); } catch (_) {}
              req.body = body;

              res.status = (code) => {
                res.statusCode = code;
                return res;
              };
              res.json = (data) => {
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify(data));
                return res;
              };

              await handler(req, res);
            });
            return;
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: String(err.message || err) }));
            return;
          }
        }
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    dictadoPlugin()
  ],
  server: {
    port: 3000,
    open: false
  }
});
