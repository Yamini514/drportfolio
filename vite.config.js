import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
// This import might be incorrect
import tailwindcss from '@tailwindcss/vite';

// Correct it to:
// import tailwindcss from 'tailwindcss';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    return {
        plugins: [react(), tailwindcss()],
        server: {
            proxy: {
                '/api': {
                    target: env.VITE_FIREBASE_APP_NODE_ENV === 'DEMO' ?
                        `http://localhost:5001/${env.VITE_FIREBASE_PROJECT_ID || 'doctorportfoliodemo'}/us-central1` :
                        `https://us-central1-${env.VITE_FIREBASE_PROJECT_ID || 'doctorportfoliodemo'}.cloudfunctions.net`,
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api/, ''),
                },
            },
        },
        define: {
            'process.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID || 'doctorportfoliodemo'),
            'process.env.VITE_FIREBASE_APP_NODE_ENV': JSON.stringify(env.VITE_FIREBASE_APP_NODE_ENV || 'DEMO'),
        },
    };
});
