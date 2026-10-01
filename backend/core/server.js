import { createServer } from 'node:http';
import { createApiHandler } from '../api/router.js';
// Inject initialized trusted Firebase Admin Auth/Firestore objects from the approved runtime.
export function createDmlServer({ auth, db }) {
  if (typeof auth?.verifyIdToken !== 'function' || typeof db?.runTransaction !== 'function') throw new Error('Trusted server dependencies are required');
  const handle = createApiHandler({ auth, db });
  return createServer(async (incoming, outgoing) => {
    try {
      const chunks = []; let size = 0;
      for await (const chunk of incoming) {
        size += chunk.length;
        if (size > 4096) { outgoing.writeHead(413, { 'Content-Type': 'application/json' }); outgoing.end('{"error":"Request too large"}'); return; }
        chunks.push(chunk);
      }
      const url = new URL(incoming.url, 'http://dml.internal');
      const request = new Request(url, { method: incoming.method, headers: incoming.headers, ...(!['GET', 'HEAD'].includes(incoming.method) ? { body: Buffer.concat(chunks) } : {}) });
      const response = await handle(request);
      outgoing.writeHead(response.status, Object.fromEntries(response.headers)); outgoing.end(await response.text());
    } catch { outgoing.writeHead(500, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); outgoing.end('{"error":"Request could not be completed"}'); }
  });
}
