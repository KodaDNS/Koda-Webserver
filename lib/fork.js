import cluster from 'node:cluster';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { worker } from './process/worker.js';
import { AdminHandler } from './admin/admin_handler.js';

export function forkprocess() {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    if (cluster.isPrimary) {
        console.log(`Communicator pid.${process.pid} is running`);

        let config, AdminConf;
        try {
            config = yaml.load(fs.readFileSync(path.join(__dirname, '../koda.yaml'), 'utf8'));
            AdminConf = yaml.load(fs.readFileSync(path.join(__dirname, '../webadmin.yaml'), 'utf8'));
        } catch (err) {
            console.error('Failed to load YAML configurations =>', err.message);
            process.exit(1);
        }

        AdminHandler(AdminConf);

        let workersct = 0;
        const workerCount = os.cpus().length;

        for (let i = 0; i < workerCount; i++) {
            const w = cluster.fork();

            w.on('message', (msg) => {
                if (msg.type === 'req.conf') {
                    w.send({ type: 'CONFIG', data: config });
                }
                if (msg.type === 'rd') {
                    workersct++;
                    if (workersct === workerCount) {
                        console.log(`Koda engine initialized across ${workerCount} cores.\nPowered by © 2026 KodaDNS Open Source Systems`);
                    }
                }
            });
        }

        cluster.on('exit', (worker) => {
            console.warn(`Worker ${worker.process.pid} died. Restarting...`);
            setTimeout(() => cluster.fork(), 2000);
        });

    } else {
        process.on('uncaughtException', (err) => {
            console.error(`Worker ${process.pid} crashed:`, err);
            process.exit(1);
        });

        process.send({ type: 'req.conf' });

        process.on('message', (msg) => {
            if (msg.type === 'CONFIG') {
                try {
                    worker(msg.data);
                    process.send({ type: 'rd' });
                } catch (err) {
                    process.exit(1);
                }
            }
        });
    }
}