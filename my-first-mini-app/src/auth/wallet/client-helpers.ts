import crypto from 'crypto';
/**
 * Generates an HMAC-SHA256 hash of the provided nonce using a secret key from the environment.
 * @param {Object} params - The parameters object.
 * @param {string} params.nonce - The nonce to be hashed.
 * @returns {string} The resulting HMAC hash in hexadecimal format.
 */
export const hashNonce = ({ nonce }: { nonce: string }) => {
  // Hardcoded fallback for production deployment
  const secretKey = process.env.HMAC_SECRET_KEY || 'fdE8Os3m43w7VlLPrysvIZqKXs3YsJAAco6aHeOYqps=';
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(nonce);
  return hmac.digest('hex');
};
