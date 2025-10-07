#!/usr/bin/env node

/**
 * VAPID Key Generator for Web Push Notifications
 * 
 * Generates a pair of VAPID keys (public and private) for use with Web Push.
 * 
 * Usage:
 *   node scripts/generate-vapid.js
 * 
 * The keys will be displayed in the console and should be added to your
 * Supabase Edge Functions secrets:
 *   - VAPID_PUBLIC_KEY
 *   - VAPID_PRIVATE_KEY
 */

const crypto = require('crypto');

function generateVapidKeys() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: {
      type: 'spki',
      format: 'der',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'der',
    },
  });

  // Convert to base64url format
  const publicKeyBase64 = publicKey.toString('base64url');
  const privateKeyBase64 = privateKey.toString('base64url');

  return {
    publicKey: publicKeyBase64,
    privateKey: privateKeyBase64,
  };
}

console.log('\n🔐 Generating VAPID keys for Web Push...\n');

const keys = generateVapidKeys();

console.log('═══════════════════════════════════════════════════════════════\n');
console.log('📋 VAPID Keys Generated Successfully!\n');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('🔑 Public Key (VAPID_PUBLIC_KEY):');
console.log(`   ${keys.publicKey}\n`);

console.log('🔒 Private Key (VAPID_PRIVATE_KEY):');
console.log(`   ${keys.privateKey}\n`);

console.log('═══════════════════════════════════════════════════════════════\n');

console.log('📝 Next Steps:\n');
console.log('1. Go to Supabase Dashboard → Settings → Edge Functions → Secrets');
console.log('2. Add the following secrets:\n');
console.log('   VAPID_PUBLIC_KEY = ' + keys.publicKey);
console.log('   VAPID_PRIVATE_KEY = ' + keys.privateKey);
console.log('   VAPID_MAILTO = mailto:your-email@domain.com\n');

console.log('3. Update src/services/webPush.ts with the public key:\n');
console.log(`   const VAPID_PUBLIC_KEY = '${keys.publicKey}';\n`);

console.log('4. Generate a strong admin token and add it to Supabase secrets:');
console.log('   PUSH_ADMIN_TOKEN = <your-strong-random-token>\n');

console.log('═══════════════════════════════════════════════════════════════\n');

console.log('⚠️  IMPORTANT: Keep the private key secret!');
console.log('   Never commit it to version control or expose it publicly.\n');

console.log('✅ VAPID keys generation complete!\n');
