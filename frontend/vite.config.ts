import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 백엔드(backend/src/app.ts)에는 CORS 미들웨어가 없으므로 개발 서버 프록시로 우회한다.
// (docs/FRONTEND_BACKEND_INTEGRATION.md 3장 참고)
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
        rewrite: (path) => path.replace(/^\/ws/, '/ws'),
      },
    },
  },
});
