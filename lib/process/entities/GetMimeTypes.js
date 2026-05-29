import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const Mimes = (() => {
    try {
        return JSON.parse(fs.readFileSync(path.join(__dirname, '../../../json/mime.json'), 'utf8'));
    } catch {
        return {};
    }
})();

export const GetMimeType = (filepath) =>
    (typeof filepath === 'string')
        ? (Mimes[path.extname(filepath).toLowerCase()] || 'text/plain')
        : 'text/plain';