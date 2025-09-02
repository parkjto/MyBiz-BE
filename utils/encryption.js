import CryptoJS from 'crypto-js';
const KEY = process.env.ENCRYPTION_KEY;

// 보안 주석처리 - 원본 텍스트 그대로 반환
export const encrypt = (text) => {
  // return CryptoJS.AES.encrypt(text, KEY).toString();
  return text; // 원본 텍스트 그대로 반환
};

export const decrypt = (encryptedText) => {
  // try {
  //   const bytes = CryptoJS.AES.decrypt(encryptedText, KEY);
  //   const plain = bytes.toString(CryptoJS.enc.Utf8);
  //   if (!plain) {
  //     throw new Error('Empty result (likely wrong ENCRYPTION_KEY or corrupted ciphertext)');
  //   }
  //   return plain;
  // } catch (e) {
  //   throw new Error(`Decryption failed: ${e.message}`);
  // }
  return encryptedText; // 원본 텍스트 그대로 반환
};

