#!/usr/bin/env node
/**
 * zuafoto — create-admin.js
 *
 * Generates a salted PBKDF2 hash for an admin login, matching exactly what
 * functions/api/auth/login.js expects, and prints the command to seed it
 * into KV (local dev, or production with --namespace-id).
 *
 * Usage:
 *   node create-admin.js admin@zuafoto.app "somePassword123"
 *   node create-admin.js admin@zuafoto.app "somePassword123" --run --local
 *   node create-admin.js admin@zuafoto.app "somePassword123" --run --namespace-id=abc123
 */

const crypto = require('crypto');
const { execSync } = require('child_process');

const ITERATIONS = 100000;
const KEY_LEN = 32; // 256 bits

function fail(msg) {
  console.error('Error: ' + msg);
  process.exit(1);
}

const args = process.argv.slice(2);
const email = args[0];
const password = args[1];
const flags = args.slice(2);

if (!email || !password) {
  fail('Usage: node create-admin.js <email> <password> [--run] [--local | --namespace-id=<id>]');
}

const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.pbkdf2Sync(password, Buffer.from(salt, 'hex'), ITERATIONS, KEY_LEN, 'sha256').toString('hex');

const kvValue = JSON.stringify({ salt, hash, iterations: ITERATIONS });
const kvKey = `admin:${email.toLowerCase()}`;

console.log('\nGenerated admin record (safe to store — this is a salted hash, never the plaintext password):\n');
console.log('  key:   ' + kvKey);
console.log('  value: ' + kvValue);

const isLocal = flags.includes('--local');
const namespaceIdFlag = flags.find(f => f.startsWith('--namespace-id='));
const shouldRun = flags.includes('--run');

let command;
if (isLocal) {
  command = `wrangler kv key put --binding=ADMIN_KV "${kvKey}" '${kvValue}' --local`;
} else if (namespaceIdFlag) {
  const namespaceId = namespaceIdFlag.split('=')[1];
  command = `wrangler kv key put --namespace-id=${namespaceId} "${kvKey}" '${kvValue}'`;
} else {
  console.log('\nNo --local or --namespace-id given — here are both commands, run whichever applies:\n');
  console.log(`  Local dev:   wrangler kv key put --binding=ADMIN_KV "${kvKey}" '${kvValue}' --local`);
  console.log(`  Production:  wrangler kv key put --namespace-id=<your-namespace-id> "${kvKey}" '${kvValue}'`);
  process.exit(0);
}

console.log('\nCommand:\n  ' + command);

if (shouldRun) {
  console.log('\nRunning it now...\n');
  try {
    execSync(command, { stdio: 'inherit' });
    console.log('\nDone — admin account is live.');
  } catch (err) {
    fail('wrangler command failed — is wrangler installed and are you in the project directory?');
  }
} else {
  console.log('\nAdd --run to execute this automatically, e.g.:');
  console.log(`  node create-admin.js "${email}" "${password}" --run --local`);
}
