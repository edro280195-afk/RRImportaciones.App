// Escribe public/version.json con una huella única de este build.
//
// La PWA lee este archivo cada minuto y, si la huella cambió, sabe que hay una
// versión nueva publicada y le ofrece al usuario recargar. Sin esto no hay forma
// de que una pestaña abierta se entere de un despliegue: el navegador solo pide
// index.html cuando se recarga, y en móvil la app puede quedarse días abierta.
//
// La huella sale del commit de git (Vercel lo expone en VERCEL_GIT_COMMIT_SHA);
// si no hay git —por ejemplo en un build desde un zip— se cae a la fecha.

import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const destino = join(__dirname, '..', 'public', 'version.json');

function commitActual() {
  const desdeEntorno =
    process.env['VERCEL_GIT_COMMIT_SHA'] ||
    process.env['GITHUB_SHA'] ||
    process.env['RENDER_GIT_COMMIT'];
  if (desdeEntorno) return desdeEntorno.slice(0, 12);

  try {
    return execSync('git rev-parse --short=12 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

const commit = commitActual();
const fecha = new Date().toISOString();

// El commit solo no basta: si se vuelve a desplegar el mismo commit (rollback,
// redeploy manual) la huella debe cambiar igual para que el cliente recargue.
const version = commit ? `${commit}.${Date.parse(fecha)}` : `build.${Date.parse(fecha)}`;

mkdirSync(dirname(destino), { recursive: true });
writeFileSync(
  destino,
  JSON.stringify({ version, commit, fechaBuild: fecha }, null, 2) + '\n',
  'utf8'
);

console.log(`version.json generado → ${version}`);
