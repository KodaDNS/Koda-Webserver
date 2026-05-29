import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { Server } from 'socket.io';
import { AdminAuth } from './auth.js';

export function AdminHandler(config) {
    const root = path.resolve(process.cwd(), config.root_dir.replace('@index', '.'));

    try {
        fs.writeFileSync(path.join(root, 'assets/dyn_config.json'), JSON.stringify({
            ws_url: `http://${config.ip}:${config.port}`
        }, null, 2));
    } catch (err) {
        console.error('Could not update dyn_config.json =>', err.message);
    }

    const server = http.createServer((req, res) => {
        let RequestedPath = req.url === '/' ? 'index.html' : req.url;
        let FilePath = path.normalize(path.join(root, RequestedPath));

        if (fs.existsSync(FilePath) && fs.statSync(FilePath).isDirectory()) {
            FilePath = path.join(FilePath, 'index.html');
        }

        if (!FilePath.startsWith(root)) {
            res.writeHead(403);
            return res.end('Forbidden');
        }

        fs.readFile(FilePath, (err, content) => {
            if (err) {
                res.writeHead(404);
                res.end('Not Found');
            } else {
                const ext = path.extname(FilePath).toLowerCase();
                const MimeTypes = {
                    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
                    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
                    '.svg': 'image/svg+xml', '.wasm': 'application/wasm'
                };
                res.writeHead(200, { 'Content-Type': MimeTypes[ext] || 'text/plain' });
                res.end(content);
            }
        });
    });

    const io = new Server(server, {
        cors: {
            origin: (origin, callback) => { callback(null, true); },
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        socket.on('auth', (data) => {
            AdminAuth(data, (result) => socket.emit('auth_result', result));
        });

        socket.on('auth_check', (data) => {
            AdminAuth(data, (result) => socket.emit('check_result', result));
        });
    });

    server.listen(config.port, config.ip, () => {
        console.log(`Admin Panel active on http://${config.ip}:${config.port}`);
    });
}