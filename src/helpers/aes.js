import crypto from 'crypto';

export default class Aes {
   aesKeyByteLength = 32;

   _aesKey;
   _initializationVector;

   CIPHER_PATTERN_PREFIX = '${ciper:';
   CIPHER_PATTERN_SUFFIX = '}';

   constructor(aesKeyString, initializationVectorString) {
      const aesKeyLength = Buffer.byteLength(aesKeyString);
      if (aesKeyLength < this.aesKeyByteLength) {
         throw new Error(`AES Key is too short (${aesKeyLength}).  It must be ${this.aesKeyByteLength} bytes.`);
      }
      if (initializationVectorString) {
         const ivLength = Buffer.byteLength(initializationVectorString);
         if (ivLength !== 16) {
            throw new Error(`Initialization Vector (${ivLength}) must be 16 bytes.`);
         }
      }

    // AES Key for CBC mode.
      const aesKeyBufOriginal = Buffer.from(aesKeyString);
      this._aesKey = Buffer.alloc(this.aesKeyByteLength);
      aesKeyBufOriginal.copy(this._aesKey, 0, 0, this.aesKeyByteLength);

    // Initialization Vector.
      const ivString = initializationVectorString || '';
      this._initializationVector = Buffer.alloc(16);
      this._initializationVector.write(ivString);
   }

   encrypt(unencrypted) {
      const cipher = crypto.createCipheriv('aes-256-cbc', this._aesKey, this._initializationVector);
      let encrypted = cipher.update(unencrypted, 'utf8', 'binary');
      encrypted += cipher.final('binary');
      return Buffer.from(encrypted, 'binary').toString('base64');
   }

   decrypt(encrypted) {
      const encryptedBuf = Buffer.from(encrypted, 'base64').toString('binary');
      const cipher = crypto.createDecipheriv('aes-256-cbc', this._aesKey, this._initializationVector);
      let decrypted = cipher.update(encryptedBuf, 'binary', 'utf8');
      decrypted += cipher.final('utf8');
      return decrypted;
   }

   decryptCiphers(cipheredString) {
      const matches = cipheredString.match(/\${cipher:[^}]*}/g);
      if (matches == null) {
         return cipheredString;
      }

      let decryptedString = cipheredString;
      for (const match of matches) { // eslint-disable-line no-restricted-syntax
         const encrypted = match.substring(this.CIPHER_PATTERN_PREFIX.length + 1, match.length - 1);
         const replacement = this.decrypt(encrypted);
         decryptedString = decryptedString.replace(match, replacement);
      }

      return decryptedString;
   }
}

