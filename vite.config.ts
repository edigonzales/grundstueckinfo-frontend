import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    'import.meta.env.VITE_MOCK_XML_BASE_PATH': JSON.stringify('/mock-data'),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
  },
});
