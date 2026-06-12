import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    if (mode === 'development') {
      console.log("\x1b[33m%s\x1b[0m", "\n=======================================================");
      console.log("\x1b[32m%s\x1b[0m", "🔥 Commove Dev Server Running in DEVELOPMENT mode");
      console.log("\x1b[36m%s\x1b[0m", "👉 Browser client will auto-connect to Local Emulators:");
      console.log("   - Auth: http://localhost:9099");
      console.log("   - Firestore: http://localhost:8080");
      console.log("   (Please ensure your local emulator suite is running!)");
      console.log("\x1b[33m%s\x1b[0m", "=======================================================\n");
    } else {
      console.log("\x1b[33m%s\x1b[0m", "\n=======================================================");
      console.log("\x1b[31m%s\x1b[0m", "🌐 Commove Dev Server Running in PRODUCTION mode");
      console.log("\x1b[36m%s\x1b[0m", "👉 Browser client will connect to Live Firebase project");
      console.log("\x1b[33m%s\x1b[0m", "=======================================================\n");
    }

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), tailwindcss()],
      build: {
        outDir: 'dist',
        rollupOptions: {
          input: 'index.html',
        },
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEOAPIFY_API_KEY': JSON.stringify(env.GEOAPIFY_API_KEY),
        'process.env.ANTHROPIC_API_KEY': JSON.stringify(env.ANTHROPIC_API_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          stream: path.resolve(__dirname, 'utils/stream-shim.js'),
        }
      }
    };
});
