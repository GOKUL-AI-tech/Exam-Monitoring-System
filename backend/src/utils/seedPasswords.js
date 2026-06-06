/**
 * Password hash generator utility
 * Run: node src/utils/seedPasswords.js
 * Use the output to update seed_demo.sql if you change demo passwords
 */
const bcrypt = require('bcryptjs');

const passwords = {
  'Admin@123': null,   // Main admin
  'Demo@123': null,    // All demo users
};

(async () => {
  console.log('Generating bcrypt hashes...\n');
  for (const [pass] of Object.entries(passwords)) {
    const hash = await bcrypt.hash(pass, 10);
    console.log(`Password: ${pass}`);
    console.log(`Hash:     ${hash}\n`);
  }
})();
