import cluster from 'node:cluster';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { worker } from './process/worker.js';

export function forkprocess() {
    if (cluster.isPrimary) {
        console.log(`Communicator pid.${process.pid} is running`);

        let config;
        try {
            const ConfigPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../koda.yaml');
            config = yaml.load(fs.readFileSync(ConfigPath, 'utf8'));
        } catch (err) {
            console.error('Failed to load koda.yaml =>', err.message);
            process.exit(1);
        }

        let workersct = 0;
        const workers = os.cpus().length;

        for (let i = 0; i < workers; i++) {
            const w = cluster.fork();

            w.on('message', (msg) => {
                if (msg.type === 'req.conf') {
                    w.send({ type: 'CONFIG', data: config });
                }

                if (msg.type === 'rd') {
                    workersct++;
                    if (workersct === workers) {
                        console.log(`Koda high performance webserver launched using ${config.hosts.length} hosts.`);
                    }
                }
            });
        }

        cluster.on('exit', (worker) => {
            console.warn(`Worker ${worker.process.pid} died. Restarting in 2s...`);
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
                    console.error(`Worker ${process.pid} failed to start:`, err);
                    process.exit(1);
                }
            }
        });
    }
}