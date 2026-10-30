import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import youtubeSearchHandler from './api/youtube-search.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Custom Vite plugin to handle /api/youtube-search in local development
const youtubeSearchDevPlugin = () => ({
  name: 'youtube-search-dev-server',
  configureServer(server) {
    server.middlewares.use('/api/youtube-search', async (req, res) => {
      const url = new URL(req.url, 'http://localhost:5173');
      const q = url.searchParams.get('q') || url.searchParams.get('query') || '';

      const mockReq = {
        query: { q },
        method: req.method
      };

      const mockRes = {
        statusCode: 200,
        headers: {},
        setHeader(name, value) {
          this.headers[name] = value;
          res.setHeader(name, value);
        },
        status(code) {
          this.statusCode = code;
          res.statusCode = code;
          return this;
        },
        json(data) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        },
        end(data) {
          res.end(data);
        }
      };

      try {
        await youtubeSearchHandler(mockReq, mockRes);
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message, results: [] }));
      }
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), youtubeSearchDevPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    proxy: {
      '/api/wallhaven': {
        target: 'https://wallhaven.cc/api/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/wallhaven/, '')
      }
    }
  }
})
