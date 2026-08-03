#!/usr/bin/env node

const { spawn } = require('node:child_process');
const fs = require('node:fs');

const env = { ...process.env };

(async () => {
  // If running the web server then migrate existing database
  if (process.argv.slice(-3).join(' ') === 'npm run start') {
    const url = new URL(process.env.DATABASE_URL);
    const target = url.protocol === 'file:' && url.pathname;

    // restore database if not present and replica exists
    let newDb = target && !fs.existsSync(target);
    if (newDb && process.env.BUCKET_NAME) {
      await exec(
        `litestream restore -config litestream.yml -if-replica-exists ${target}`,
      );
      newDb = !fs.existsSync(target);
    }

    // prepare database
    await ensureDatabaseReady();
    if (newDb) await exec('ts-node prisma/seed.ts');
  }

  // launch application
  if (process.env.BUCKET_NAME) {
    await exec(
      `litestream replicate -config litestream.yml -exec ${JSON.stringify(process.argv.slice(2).join(' '))}`,
    );
  } else {
    await exec(process.argv.slice(2).join(' '));
  }
})();

async function ensureDatabaseReady() {
  try {
    await exec('npx prisma migrate deploy');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('P3005')) {
      await exec('npx prisma db push');
      return;
    }

    throw error;
  }
}

function exec(command) {
  const child = spawn(command, { shell: true, stdio: 'inherit', env });
  return new Promise((resolve, reject) => {
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} failed rc=${code}`));
      }
    });
  });
}
