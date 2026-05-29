import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GetMimeType } from '../GetMimeTypes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const POLICIES = (() => {
    try {
        return JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../../json/security_policies.json'), 'utf8'));
    } catch (err) {
        console.error('Failed to load security_policies.json. Falling back to empty defaults. =>', err.message);
        return { xss: { low: [] }, security: { low: [] } };
    }
})();

export function StreamFile(socket, FilePath, stats, h) {
    const stream = fs.createReadStream(FilePath);
    const timeout = h.connection_timeout || 5;

    const xss = POLICIES.xss?.[h.security?.xss_headers] || POLICIES.xss.low || [];
    let sec = POLICIES.security?.[h.security?.security_headers] || POLICIES.security.low || [];

    if (h.security?.allow_iframes === true) {
        sec = sec.filter(header => !header.startsWith('X-Frame-Options'));
    }

    const headers = [
        'HTTP/1.1 200 OK',
        `Date: ${new Date().toUTCString()}`,
        'X-Powered-By: Koda Webserver',
        ...xss,
        ...sec,
        'Cache-Control: public, max-age=3600',
        `Content-Type: ${GetMimeType(FilePath)}`,
        `Content-Length: ${stats.size}`,
        'Connection: keep-alive',
        `Keep-Alive: timeout=${timeout}`,
        '\r\n'
    ].join('\r\n');

    socket.write(headers);
    stream.pipe(socket, { end: false });
}