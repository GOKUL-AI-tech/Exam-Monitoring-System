// Run this: node find_db_password.js
// It will find your correct PostgreSQL password automatically
const { Client } = require('pg');

const passwords = ['', 'postgres', 'admin', '1234', '12345', 'password', 'root', 'postgres123', 'admin123', 'test'];

async function tryPassword(pwd) {
  const client = new Client({ host: 'localhost', port: 5432, database: 'exam_proctoring', user: 'postgres', password: pwd, connectionTimeoutMillis: 3000 });
  try {
    await client.connect();
    await client.end();
    return true;
  } catch { return false; }
}

(async () => {
  console.log('\nFinding your PostgreSQL password...\n');
  for (const pwd of passwords) {
    process.stdout.write(`Trying: "${pwd}" ... `);
    if (await tryPassword(pwd)) {
      console.log('✅ FOUND!\n');
      console.log('='.repeat(50));
      console.log(`YOUR PASSWORD IS: "${pwd}"`);
      console.log('='.repeat(50));
      console.log(`\nNow open backend\\.env and set:\nDB_PASSWORD=${pwd}\n`);
      process.exit(0);
    } else { console.log('❌'); }
  }
  console.log('\n❌ None matched. Open pgAdmin → right-click PostgreSQL 18 → Properties → Connection → reset password there, then update backend\\.env');
})();
