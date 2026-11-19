// Arranca API (3000) y frontend (5173) a la vez para desarrollo en navegador.
import { spawn } from 'node:child_process';

const procs = ['dev:api', 'dev:web'].map((script) =>
  spawn('npm', ['run', script], { stdio: 'inherit', shell: true }),
);
const stop = () => procs.forEach((p) => p.kill());
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
