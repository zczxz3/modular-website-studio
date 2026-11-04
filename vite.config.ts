import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()], base:'./', server:{allowedHosts:['terminal.local']}, test:{include:['tests/**/*.test.ts']}, build:{chunkSizeWarningLimit:2000}});
