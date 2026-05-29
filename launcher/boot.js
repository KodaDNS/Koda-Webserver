import { forkprocess } from '../lib/fork.js';

try {
    forkprocess();
} catch (err) {
    console.error("Fatal startup error =>", err);
    process.exit(1);
}