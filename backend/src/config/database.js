// Database configuration — auto-detects correct PostgreSQL password
const { Pool } = require('pg');
require('dotenv').config();

const COMMON_PASSWORDS = [
  process.env.DB_PASSWORD,   // try .env first
  'postgres123',
  'postgres',
  'admin',
  '1234',
  '12345',
  'password',
  'root',
  '',                        // blank password
  'admin123',
  'test',
  'Pass@123',
];

let pool = null;

async function createPool(password) {
  const p = new Pool({
    host:     process.env.DB_HOST || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'exam_proctoring',
    user:     process.env.DB_USER || 'postgres',
    password: password,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 3000,
  });
  // Test the connection
  const client = await p.connect();
  client.release();
  return p;
}

async function initPool() {
  for (const pwd of COMMON_PASSWORDS) {
    try {
      pool = await createPool(pwd);
      const display = pwd === '' ? '(blank)' : pwd;
      console.log(`\n✅ PostgreSQL connected with password: "${display}"`);
      console.log(`💡 To avoid this scan, set DB_PASSWORD=${display} in backend\\.env\n`);

      // Auto-update .env file with the working password
      const fs = require('fs');
      const path = require('path');
      const envPath = path.join(__dirname, '../../.env');
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf8');
        envContent = envContent.replace(/DB_PASSWORD=.*/,`DB_PASSWORD=${display}`);
        fs.writeFileSync(envPath, envContent);
        console.log(`✅ Auto-saved working password to .env\n`);
      }
      return pool;
    } catch (err) {
      // Wrong password — try next
    }
  }

  // Nothing worked — print helpful message
  console.error('\n❌ Could not connect to PostgreSQL with any common password.');
  console.error('👉 Fix: Open pgAdmin → Query Tool → run:');
  console.error("   ALTER USER postgres PASSWORD 'postgres123';");
  console.error("   Then restart backend.\n");
  process.exit(1);
}

// Proxy object — all queries wait until pool is ready
const handler = {
  get(target, prop) {
    if (prop === 'query') {
      return (...args) => target.query(...args);
    }
    return target[prop];
  }
};

// Initialize immediately
const poolReady = initPool();

// Export a proxy that waits for pool before any query
module.exports = {
  query: async (...args) => {
    await poolReady;
    return pool.query(...args);
  },
  connect: async () => {
    await poolReady;
    return pool.connect();
  },
  on: (event, cb) => {
    poolReady.then(() => pool.on(event, cb));
  }
};
