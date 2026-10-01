// Builds data.enc.json from data.json + passwords.json (both kept OFF the website).
//   node tools/encrypt.js data.json passwords.json  ->  data.enc.json
const c = require('crypto'), fs = require('fs');
const data = fs.readFileSync(process.argv[2]), pw = JSON.parse(fs.readFileSync(process.argv[3]));
const ITER = 250000, out = { v: 1, iter: ITER, users: {} };
for (const [u, p] of Object.entries(pw)) {
  const salt = c.randomBytes(16), iv = c.randomBytes(12);
  const key = c.pbkdf2Sync(p, salt, ITER, 32, 'sha256');
  const ci = c.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([ci.update(data), ci.final(), ci.getAuthTag()]); // WebCrypto expects tag appended
  out.users[u] = { salt: salt.toString('base64'), iv: iv.toString('base64'), ct: enc.toString('base64') };
}
fs.writeFileSync('data.enc.json', JSON.stringify(out));
console.log('wrote data.enc.json for', Object.keys(pw).join(', '));
