import * as crypto from 'crypto';

function getAesKey(): Buffer {
  const appKey = process.env.APP_KEY ?? 'evershop-bot-key-change-in-production!!!';
  return crypto.createHash('sha256').update(appKey).digest();
}

export function generateBotKeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  return { publicKey, privateKey };
}

// Encrypt private key with AES-256-GCM before storing in DB
export function encryptPrivateKey(pem: string): string {
  const key = getAesKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(pem, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Layout: iv(12) | authTag(16) | ciphertext(N)
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function decryptPrivateKey(encryptedBase64: string): string {
  const key = getAesKey();
  const data = Buffer.from(encryptedBase64, 'base64');
  const iv = data.subarray(0, 12);
  const authTag = data.subarray(12, 28);
  const encrypted = data.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
}

// Issue a self-contained RS256 JWT signed with the bot's RSA private key
export function issueRsaJwt(
  payload: Record<string, unknown>,
  privateKeyPem: string,
  expiresInSeconds = 3600
): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const claims = { ...payload, iat: now, exp: now + expiresInSeconds };
  const body = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signing = `${header}.${body}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signing);
  const sig = sign.sign(privateKeyPem, 'base64url');
  return `${signing}.${sig}`;
}

// Verify JWT signature with the bot's RSA public key (stored in DB)
export function verifyRsaJwt(
  token: string,
  publicKeyPem: string
): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed JWT');
  const [header, body, sig] = parts;
  const verify = crypto.createVerify('RSA-SHA256');
  verify.update(`${header}.${body}`);
  if (!verify.verify(publicKeyPem, sig, 'base64url')) {
    throw new Error('Invalid JWT signature');
  }
  const payload = JSON.parse(
    Buffer.from(body, 'base64url').toString('utf8')
  ) as Record<string, unknown>;
  const exp = payload.exp as number | undefined;
  if (exp && exp < Math.floor(Date.now() / 1000)) {
    throw new Error('JWT expired');
  }
  return payload;
}
