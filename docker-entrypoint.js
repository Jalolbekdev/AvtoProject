#!/usr/bin/env node

const { spawn } = require('node:child_process');
const fs = require('node:fs');

const env = { ...process.env };

function cleanDatabaseUrl(raw) {
  if (!raw) return raw;
  return raw.trim().replace(/^['"]|['"]$/g, '');
}

(async () => {
  // If running the web server then migrate existing database
  if (process.argv.slice(-3).join(' ') === 'npm run start') {
    const databaseUrl = cleanDatabaseUrl(process.env.DATABASE_URL) || 'file:///data/sqlite.db';
    let target;

    try {
      const url = new URL(databaseUrl);
      target = url.protocol === 'file:' ? url.pathname : undefined;
    } catch (error) {
      console.error('Invalid DATABASE_URL:', databaseUrl);
      throw error;
    }

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
    if (newDb) await exec('npx ts-node prisma/seed.ts');
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
  const child = spawn(command, { shell: true, env });
  let stdout = '';
  let stderr = '';

  if (child.stdout) {
    child.stdout.on('data', (chunk) => {
      process.stdout.write(chunk);
      stdout += chunk;
    });
  }

  if (child.stderr) {
    child.stderr.on('data', (chunk) => {
      process.stderr.write(chunk);
      stderr += chunk;
    });
  }

  return new Promise((resolve, reject) => {
    child.on('error', (error) => {
      reject(error);
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} failed rc=${code}\n${stdout}${stderr}`));
      }
    });
  });
}
