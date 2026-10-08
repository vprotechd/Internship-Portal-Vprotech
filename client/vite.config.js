import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
// Proxy keeps API same-origin so the httpOnly auth cookie works in dev
export default defineConfig({ plugins: [react(), tailwind()], server: { proxy: { '/api': 'http://localhost:5000' } } });
