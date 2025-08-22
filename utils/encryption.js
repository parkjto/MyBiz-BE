import CryptoJS from 'crypto-js';
const KEY = process.env.ENCRYPTION_KEY;

export const encrypt = text => CryptoJS.AES.encrypt(text, KEY).toString();
export const decrypt = text => CryptoJS.AES.decrypt(text, KEY).toString(CryptoJS.enc.Utf8);

