const crypto = require('crypto');

/**
 * Encryption Utility for securing sensitive data like API keys
 * Uses AES-256-GCM encryption with authentication
 * 
 * Requires ENCRYPTION_KEY environment variable (32 bytes hex)
 * Generate with: node -e "console.log(crypto.randomBytes(32).toString('hex'))"
 */
class Encryption {
  
  /**
   * Get encryption key from environment
   * @returns {Buffer} Encryption key
   * @throws {Error} If ENCRYPTION_KEY not set
   */
  static getKey() {
    const key = process.env.ENCRYPTION_KEY;
    
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable not set. Generate one with: node -e "console.log(crypto.randomBytes(32).toString(\'hex\'))"');
    }
    
    if (key.length !== 64) {
      throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
    }
    
    return Buffer.from(key, 'hex');
  }
  
  /**
   * Encrypt text using AES-256-GCM
   * @param {string} text - Plain text to encrypt
   * @returns {string} Encrypted text in format: iv:authTag:encrypted
   * @throws {Error} If encryption fails
   */
  static encrypt(text) {
    try {
      if (!text) {
        throw new Error('Text to encrypt cannot be empty');
      }
      
      const key = this.getKey();
      const iv = crypto.randomBytes(16); // 128-bit IV for GCM
      
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Format: iv:authTag:encryptedData
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
      
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }
  
  /**
   * Decrypt text encrypted with AES-256-GCM
   * @param {string} encrypted - Encrypted text in format: iv:authTag:encrypted
   * @returns {string} Decrypted plain text
   * @throws {Error} If decryption fails
   */
  static decrypt(encrypted) {
    try {
      if (!encrypted) {
        throw new Error('Encrypted text cannot be empty');
      }
      
      const parts = encrypted.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted format. Expected: iv:authTag:encrypted');
      }
      
      const [ivHex, authTagHex, encryptedText] = parts;
      const key = this.getKey();
      
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(ivHex, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
      
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
      
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }
  
  /**
   * Test encryption/decryption with sample data
   * Useful for verifying ENCRYPTION_KEY is set correctly
   * @returns {boolean} True if encryption/decryption works
   */
  static test() {
    try {
      const testText = 'test_api_key_12345';
      const encrypted = this.encrypt(testText);
      const decrypted = this.decrypt(encrypted);
      
      if (decrypted !== testText) {
        throw new Error('Decrypted text does not match original');
      }
      
      console.log('✅ Encryption test passed');
      return true;
      
    } catch (error) {
      console.error('❌ Encryption test failed:', error.message);
      return false;
    }
  }
}

module.exports = Encryption;
