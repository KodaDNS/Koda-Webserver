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
        const HyperCfg = h.hypercache || { enabled: false, update_interval_ms: 1000, min_requests_per_interval: 1, detection_frame_ms: 5000 };
        const DdosCfg = h.ddos || { max_connection_requests_frame: 25, max_connection_requests_frame_ms: 1000, max_packet_size: 64000, max_packet_size_frame_ms: 1000 };
        const TO = h.timeouts || { connection: 5000, request_read: 2000, keep_alive: 5000 };

        const FileCache = new LRUCache({
            max: CacheCfg.max_objects,
            ttl: CacheCfg.ttl_seconds * 1000,
        });

        const ProxyCache = new LRUCache({
            max: CacheCfg.max_objects,
            ttl: CacheCfg.ttl_seconds * 1000,
        });

        const ConnectionHandler = (socket) => {
            socket.setTimeout(TO.connection);

            let TunnelingEnabled = false;

            let ClientReqCount = 0;
            let ClientReqFrameStart = Date.now();

            let ClientPacketSizeCount = 0;
            let ClientPacketFrameStart = Date.now();

            socket.on('timeout', () => socket.destroy());
            socket.on('error', () => { });

            socket.on('data', async (data) => {
                const now = Date.now();

                if (now - ClientReqFrameStart > DdosCfg.max_connection_requests_frame_ms) {
                    ClientReqCount = 0;
                    ClientReqFrameStart = now;
                }
                ClientReqCount++;
                if (ClientReqCount > DdosCfg.max_connection_requests_frame) {
                    return socket.end('HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n');
                }

                if (now - ClientPacketFrameStart > DdosCfg.max_packet_size_frame_ms) {
                    ClientPacketSizeCount = 0;
                    ClientPacketFrameStart = now;
                }
                ClientPacketSizeCount += data.length;
                if (ClientPacketSizeCount > DdosCfg.max_packet_size) {
                    return socket.end('HTTP/1.1 413 Payload Too Large\r\nConnection: close\r\n\r\n');
                }

                const RequestString = data.toString();
                const IsWebsocket = RequestString.includes('Upgrade: websocket');

                if (h.proxy_host?.enabled && !TunnelingEnabled) {
                    if (IsWebsocket && !h.proxy_host.websockets) {
                        return socket.end('HTTP/1.1 403 Forbidden\r\n\r\nWebSockets Disabled');
                    }

                    TunnelingEnabled = true;
                    const CacheKey = RequestString.split('\r\n')[0];

                    if (h.proxy_host.cache) {
                        const cached = ProxyCache.get(CacheKey);
                        if (cached?.data) {
                            socket.write(cached.data);
                            return socket.end();
                        }
                    }

                    const target = net.createConnection({
                        host: h.proxy_host.dest_host,
                        port: h.proxy_host.dest_port
                    });

                    let RespBuffer = Buffer.alloc(0);
                    let HeadersSent = false;

                    target.on('connect', () => {
                        target.write(data);
                    });

                    target.on('data', (chunk) => {
                        RespBuffer = Buffer.concat([RespBuffer, chunk]);

                        socket.write(chunk);
                        if (!HeadersSent) {
                            HeadersSent = RespBuffer.includes(Buffer.from('\r\n\r\n'));
                        }
                    });

                    target.on('end', () => {
                        if (h.proxy_host.cache && !IsWebsocket && RespBuffer.length > 0) {
                            const ShouldCache = RespBuffer.length <= (CacheCfg.max_file_size || 5242880);

                            if (ShouldCache) {
                                const now = Date.now();
                                let entry = ProxyCache.get(CacheKey);

                                if (entry) {
                                    entry.LastHit = now;
                                    entry.hits = (now - (entry.LastHit || 0) <= (HyperCfg.detection_frame_ms || 5000))
                                        ? (entry.hits || 0) + 1 : 1;

                                    if (HyperCfg.enabled && h.proxy_host.hypercache &&
                                        (now - entry.LastRefreshed >= HyperCfg.update_interval_ms) &&
                                        (entry.hits >= HyperCfg.min_requests_per_interval)) {

                                        ProxyCache.set(CacheKey, {
                                            data: RespBuffer,
                                            hits: 0,
                                            LastRefreshed: now,
                                            LastHit: now
                                        });
                                    }
                                } else {
                                    ProxyCache.set(CacheKey, {
                                        data: RespBuffer,
                                        hits: 1,
                                        LastRefreshed: now,
                                        LastHit: now
                                    });
                                }
                            }
                        }
                        socket.end();
                    });

                    target.on('error', () => {
                        if (!socket.destroyed) socket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
                    });

                    return;
                }

                socket.setTimeout(TO.request_read);
                try {
                    const match = RequestString.match(/GET\s+(.*?)\s+HTTP/);
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
                        entry.hits = (now - (entry.LastHit || 0) <= (HyperCfg.detection_frame_ms || 5000))
                            ? (entry.hits || 0) + 1 : 1;

                        if (HyperCfg.enabled && (now - entry.LastRefreshed >= HyperCfg.update_interval_ms) &&
                            (entry.hits >= HyperCfg.min_requests_per_interval)) {

                            entry.LastRefreshed = now;
                            fsp.stat(TargetPath).then(NewStats => {
                                FileCache.set(TargetPath, { stats: NewStats, hits: 0, LastRefreshed: now, LastHit: now });
                            }).catch(() => {});
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