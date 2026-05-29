import fs from 'node:fs';
import path from 'node:path';

export function ServeErrorPage(socket, root) {
    const date = new Date().toUTCString();
    const errpath = path.join(root, '404.html');

    fs.readFile(errpath, (err, content) => {
        const found = !err;
        const body = found ? content : '404 Not Found';
        const contenttype = found ? 'text/html' : 'text/plain';

        const headers = [
            'HTTP/1.1 404 Not Found',
            `Date: ${date}`,
            'X-Powered-By: Koda Webserver',
            `Content-Type: ${contenttype}`,
            `Content-Length: ${body.length}`,
            'Connection: close'
        ];

        try {
            if (socket.writable) {
                socket.write(headers.join('\r\n') + '\r\n\r\n');
                socket.write(body);
            }
        } catch (socketErr) { } finally {
            socket.end();
        }
    });
}