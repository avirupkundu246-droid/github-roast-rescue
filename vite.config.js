import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

function apiPlugin(mode) {
  return {
    name: 'api-server-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost')
        if (url.pathname === '/api/analyze') {
          // Ensure process.env.GITHUB_TOKEN is populated from .env.local
          if (!process.env.GITHUB_TOKEN) {
            const env = loadEnv(server.config.mode || mode || 'development', process.cwd(), '')
            if (env.GITHUB_TOKEN) {
              process.env.GITHUB_TOKEN = env.GITHUB_TOKEN.trim()
            }
          }

          // Attach baseline security headers
          res.setHeader('X-Content-Type-Options', 'nosniff')
          res.setHeader('X-Frame-Options', 'DENY')
          res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

          try {
            const { default: handler } = await import('./api/analyze.js')
            return await handler(req, res)
          } catch (err) {
            console.error('Error invoking /api/analyze:', err)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                error: 'An internal server error occurred in API middleware.',
              })
            )
            return
          }
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables server-side from .env and .env.local
  const env = loadEnv(mode, process.cwd(), '')
  if (env.GITHUB_TOKEN) {
    process.env.GITHUB_TOKEN = env.GITHUB_TOKEN.trim()
  }

  return {
    plugins: [react(), apiPlugin(mode)],
  }
})
