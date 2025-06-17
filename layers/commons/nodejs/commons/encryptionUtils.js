const crypto = require('crypto');

function generateInitializationVector() {
    return crypto.randomBytes(16);
}

function generateKey(secret) {
    return crypto.scryptSync(secret, 'salt', 32);
}

function encrypt(secret, text) {
    let iv = generateInitializationVector();
    let cipher = crypto.createCipheriv(algorithm, generateKey(secret), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return { iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') };
}

function decrypt(secret, encrypted) {
    let iv = Buffer.from(encrypted.iv, 'hex');
    let encryptedText = Buffer.from(encrypted.encryptedData, 'hex');
    let decipher = crypto.createDecipheriv(algorithm, generateKey(secret), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

module.exports = {
    encrypt,
    decrypt
};