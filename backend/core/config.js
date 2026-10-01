import { fileURLToPath } from 'node:url';
// Resolve from this module, never from the caller's current working directory.
export const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
export const recoveredDataRoot = fileURLToPath(new URL('../../data/recovered_data/', import.meta.url));
export const rulebookPath = fileURLToPath(new URL('../../docs/rulebook.md', import.meta.url));
