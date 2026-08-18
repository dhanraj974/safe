/**
 * Cryptography Module for Secure Bluetooth Chat
 * Implements AES-256-GCM encryption and ECDH key exchange using Web Crypto API
 */

class CryptoManager {
    constructor() {
        this.keyPair = null;
        this.sharedSecret = null;
        this.sessionKey = null;
        this.messageCounter = 0;
        this.peerPublicKey = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the crypto manager by generating an ECDH key pair
     */
    async initialize() {
        try {
            // Generate ECDH key pair using P-256 curve
            this.keyPair = await window.crypto.subtle.generateKey(
                {
                    name: 'ECDH',
                    namedCurve: 'P-256'
                },
                true,
                ['deriveKey', 'deriveBits']
            );

            this.isInitialized = true;
            console.log('Crypto manager initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize crypto manager:', error);
            throw new Error('Encryption initialization failed');
        }
    }

    /**
     * Export public key in JWK format for transmission
     */
    async exportPublicKey() {
        if (!this.keyPair) {
            throw new Error('Key pair not initialized');
        }

        try {
            const publicKey = await window.crypto.subtle.exportKey(
                'jwk',
                this.keyPair.publicKey
            );
            return publicKey;
        } catch (error) {
            console.error('Failed to export public key:', error);
            throw new Error('Failed to export public key');
        }
    }

    /**
     * Import peer's public key
     */
    async importPeerPublicKey(publicKeyJwk) {
        try {
            this.peerPublicKey = await window.crypto.subtle.importKey(
                'jwk',
                publicKeyJwk,
                {
                    name: 'ECDH',
                    namedCurve: 'P-256'
                },
                true,
                []
            );
            console.log('Peer public key imported');
            return true;
        } catch (error) {
            console.error('Failed to import peer public key:', error);
            throw new Error('Failed to import peer public key');
        }
    }

    /**
     * Derive shared secret using ECDH
     */
    async deriveSharedSecret() {
        if (!this.keyPair || !this.peerPublicKey) {
            throw new Error('Key pair or peer public key not available');
        }

        try {
            // Derive bits using ECDH
            const sharedBits = await window.crypto.subtle.deriveBits(
                {
                    name: 'ECDH',
                    public: this.peerPublicKey
                },
                this.keyPair.privateKey,
                256
            );

            this.sharedSecret = sharedBits;
            console.log('Shared secret derived');
            return true;
        } catch (error) {
            console.error('Failed to derive shared secret:', error);
            throw new Error('Key exchange failed');
        }
    }

    /**
     * Derive session key from shared secret using HKDF
     */
    async deriveSessionKey() {
        if (!this.sharedSecret) {
            throw new Error('Shared secret not available');
        }

        try {
            // Import shared secret as a key
            const sharedKey = await window.crypto.subtle.importKey(
                'raw',
                this.sharedSecret,
                'HKDF',
                false,
                ['deriveKey']
            );

            // Derive AES-GCM key using HKDF
            this.sessionKey = await window.crypto.subtle.deriveKey(
                {
                    name: 'HKDF',
                    hash: 'SHA-256',
                    salt: new Uint8Array(16), // Fixed salt for simplicity
                    info: new TextEncoder().encode('bluetooth-chat-session')
                },
                sharedKey,
                {
                    name: 'AES-GCM',
                    length: 256
                },
                false,
                ['encrypt', 'decrypt']
            );

            console.log('Session key derived');
            return true;
        } catch (error) {
            console.error('Failed to derive session key:', error);
            throw new Error('Failed to derive session key');
        }
    }

    /**
     * Generate a unique nonce/IV for encryption
     */
    generateNonce() {
        // Combine message counter with random bytes for unique nonce
        const counterBytes = new Uint8Array(4);
        const view = new DataView(counterBytes.buffer);
        view.setUint32(0, this.messageCounter, false);

        const randomBytes = new Uint8Array(8);
        window.crypto.getRandomValues(randomBytes);

        const nonce = new Uint8Array(12);
        nonce.set(counterBytes, 0);
        nonce.set(randomBytes, 4);

        this.messageCounter++;
        return nonce;
    }

    /**
     * Encrypt a message using AES-256-GCM
     * @param {string} plaintext - The message to encrypt
     * @returns {Object} Encrypted data with nonce and ciphertext
     */
    async encryptMessage(plaintext) {
        if (!this.sessionKey) {
            throw new Error('Session key not available');
        }

        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(plaintext);
            const nonce = this.generateNonce();

            const encrypted = await window.crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: nonce
                },
                this.sessionKey,
                data
            );

            return {
                nonce: Array.from(nonce),
                ciphertext: Array.from(new Uint8Array(encrypted)),
                counter: this.messageCounter - 1
            };
        } catch (error) {
            console.error('Encryption failed:', error);
            throw new Error('Message encryption failed');
        }
    }

    /**
     * Decrypt a message using AES-256-GCM
     * @param {Object} encryptedData - Object containing nonce, ciphertext, and counter
     * @returns {string} Decrypted plaintext message
     */
    async decryptMessage(encryptedData) {
        if (!this.sessionKey) {
            throw new Error('Session key not available');
        }

        try {
            const nonce = new Uint8Array(encryptedData.nonce);
            const ciphertext = new Uint8Array(encryptedData.ciphertext);
            const counter = encryptedData.counter;

            // Replay protection: reject old messages
            if (counter < this.messageCounter - 100) {
                throw new Error('Replay attack detected: message counter too old');
            }

            const decrypted = await window.crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: nonce
                },
                this.sessionKey,
                ciphertext
            );

            const decoder = new TextDecoder();
            return decoder.decode(decrypted);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Message decryption failed or invalid authentication tag');
        }
    }

    /**
     * Generate security fingerprint code for device verification
     * Uses the shared secret to create a short, human-readable code
     */
    async generateSecurityCode() {
        if (!this.sharedSecret) {
            throw new Error('Shared secret not available');
        }

        try {
            // Create a hash of the shared secret
            const sharedKey = await window.crypto.subtle.importKey(
                'raw',
                this.sharedSecret,
                'HKDF',
                false,
                ['deriveBits']
            );

            const hashBits = await window.crypto.subtle.deriveBits(
                {
                    name: 'HKDF',
                    hash: 'SHA-256',
                    salt: new Uint8Array(16),
                    info: new TextEncoder().encode('security-fingerprint')
                },
                sharedKey,
                128
            );

            // Convert to 3-digit groups
            const hashArray = new Uint8Array(hashBits);
            const num1 = (hashArray[0] + hashArray[1] * 256) % 1000;
            const num2 = (hashArray[2] + hashArray[3] * 256) % 1000;
            const num3 = (hashArray[4] + hashArray[5] * 256) % 1000;

            return `${String(num1).padStart(3, '0')} ${String(num2).padStart(3, '0')} ${String(num3).padStart(3, '0')}`;
        } catch (error) {
            console.error('Failed to generate security code:', error);
            throw new Error('Failed to generate security code');
        }
    }

    /**
     * Verify security code matches (for comparison)
     * @param {string} code1 - First security code
     * @param {string} code2 - Second security code
     * @returns {boolean} True if codes match
     */
    verifySecurityCode(code1, code2) {
        // Remove spaces and compare
        const normalized1 = code1.replace(/\s/g, '');
        const normalized2 = code2.replace(/\s/g, '');
        return normalized1 === normalized2;
    }

    /**
     * Clean up sensitive data when session ends

     */
    cleanup() {
        this.keyPair = null;
        this.sharedSecret = null;
        this.sessionKey = null;
        this.peerPublicKey = null;
        this.messageCounter = 0;
        this.isInitialized = false;
        console.log('Crypto manager cleaned up');
    }

    /**
     * Check if crypto manager is ready for encryption/decryption
     */
    isReady() {
        return this.isInitialized && this.sessionKey !== null;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CryptoManager;
}
