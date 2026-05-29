import net from 'node:net';
import tls from 'node:tls';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LRUCache } from 'lru-cache';
import { ServeErrorPage } from './entities/serve/ErrorPage.js';
import { StreamFile } from './entities/serve/StreamPage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function worker(config) {
    config.hosts.forEach((h) => {
        const root = path.resolve(path.join(__dirname, '../../'), h.root_dir.replace('@index', '').replace(/^[/\\]+/, ''));
        
        const CacheCfg = h.cache_settings || { max_objects: 500, ttl_seconds: 3600 };
        const HyperCfg = h.hypercache || { enabled: false, update_interval_ms: 1000, min_requests_per_interval: 1, detection_window_ms: 5000 };
        const TO = h.timeouts || { connection: 5000, request_read: 2000, keep_alive: 5000 };

        const FileCache = new LRUCache({
            max: CacheCfg.max_objects,
            ttl: CacheCfg.ttl_seconds * 1000,
        });

        const ConnectionHandler = (socket) => {
            socket.setTimeout(TO.connection);

            socket.on('timeout', () => socket.destroy());
            socket.on('error', () => { });

            socket.on('data', async (data) => {
                socket.setTimeout(TO.request_read);

                try {
                    const request = data.toString();
                    const match = request.match(/GET\s+(.*?)\s+HTTP/);
                    if (!match) return;

                    const DecodedPath = decodeURIComponent(match[1]);
                    const TargetPath = path.normalize(path.join(root, DecodedPath === '/' ? 'index.html' : DecodedPath));

                    if (!TargetPath.startsWith(root)) {
                        socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\nForbidden');
                        return socket.end();
                    }

                    let entry = FileCache.get(TargetPath);
                    const now = Date.now();

                    if (entry) {
                        entry.LastHit = now;
                        entry.hits = (now - (entry.LastHit || 0) <= (HyperCfg.detection_window_ms || 5000))
                            ? (entry.hits || 0) + 1
                            : 1;

                        if (HyperCfg.enabled && (now - entry.LastRefreshed >= HyperCfg.update_interval_ms) && (entry.hits >= HyperCfg.min_requests_per_interval)) {
                            entry.LastRefreshed = now;
                            fsp.stat(TargetPath).then(NewStats => {
                                FileCache.set(TargetPath, { stats: NewStats, hits: 0, LastRefreshed: now, LastHit: now });
                            }).catch(() => { });
                        }
                    } else {
                        const stats = await fsp.stat(TargetPath);
                        entry = { stats, hits: 1, LastRefreshed: now, LastHit: now };

                        const min = CacheCfg.min_file_size || 512;
                        const max = CacheCfg.max_file_size || Infinity;

                        if (stats.size >= min && stats.size <= max) {
                            FileCache.set(TargetPath, entry);
                        }
                    }

                    socket.setTimeout(TO.keep_alive);
                    StreamFile(socket, TargetPath, entry.stats, h);
                } catch (err) {
                    ServeErrorPage(socket, root);
                }
            });
        };

        const server = (h.ssl?.enabled)
            ? tls.createServer({
                key: fs.readFileSync(h.ssl.key.replace('@index', path.join(__dirname, '../../'))),
                cert: fs.readFileSync(h.ssl.cert.replace('@index', path.join(__dirname, '../../')))
            }, ConnectionHandler)
            : net.createServer(ConnectionHandler);

        server.keepAliveTimeout = TO.keep_alive;
        server.headersTimeout = TO.request_read;

        server.listen(h.port, h.ip === '*' ? '0.0.0.0' : h.ip, () => {
            process.send({ type: 'READY' });
        });
    });
}