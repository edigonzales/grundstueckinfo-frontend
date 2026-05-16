import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

(globalThis as any).ResizeObserver = ResizeObserverMock;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const originalFetch = globalThis.fetch;

(globalThis as any).fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : input.toString();

  if (url.startsWith('/mock-data/')) {
    const filePath = join(__dirname, '../../public', url);
    const text = readFileSync(filePath, 'utf-8');
    return new Response(text, { status: 200, headers: { 'Content-Type': 'application/xml' } });
  }

  if (originalFetch) {
    return originalFetch(input, init);
  }

  throw new Error(`fetch not available for ${url}`);
};
