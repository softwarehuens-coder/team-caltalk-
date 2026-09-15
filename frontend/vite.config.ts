import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 백엔드(backend/src/app.ts)에는 CORS 미들웨어가 없으므로 개발 서버 프록시로 우회한다.
// (docs/FRONTEND_BACKEND_INTEGRATION.md 3장 참고). 실시간 채팅(UC5)은 WebSocket이
// 아니라 REST 롱폴링으로 구현되어 있어 /api 프록시만으로 충분하다.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
