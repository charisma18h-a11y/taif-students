// Run: node scripts/generate-push-keys.mjs
// Set resulting secrets ONLY in Vercel Environment Variables; never commit them to GitHub.
import { generateKeyPairSync } from 'node:crypto'
const { privateKey } = generateKeyPairSync('ec',{namedCurve:'prime256v1'})
const jwk=privateKey.export({format:'jwk'})
const enc=x=>Buffer.from(x,'base64url')
const pub=Buffer.concat([Buffer.from([4]),enc(jwk.x),enc(jwk.y)]).toString('base64url')
console.log('VAPID_PUBLIC_KEY='+pub)
console.log('VAPID_PRIVATE_KEY='+jwk.d)
console.log('VAPID_CONTACT=mailto:your-real-email@example.com  (REPLACE with your real address)')
