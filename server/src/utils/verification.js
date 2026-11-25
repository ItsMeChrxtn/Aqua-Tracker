// Public QR verification of approved registrations. Each approved fisherfolk
// registration / fishpond gets an unguessable code; its QR opens
// <client>/verify/<code>, which anyone can scan to confirm it is genuine.
const crypto = require('crypto');
const QRCode = require('qrcode');

const newVerifyCode = () => crypto.randomBytes(9).toString('base64url'); // 12 characters

// Gives an approved document its code if it has none yet (older approvals).
async function ensureVerifyCode(doc) {
  if (!doc || doc.status !== 'approved' || doc.verifyCode) return doc;
  doc.verifyCode = newVerifyCode();
  await doc.constructor.updateOne({ _id: doc._id }, { $set: { verifyCode: doc.verifyCode } });
  return doc;
}

function verifyUrl(code) {
  const base = String(process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '');
  return `${base}/verify/${code}`;
}

const qrPng = (code) => QRCode.toBuffer(verifyUrl(code), { margin: 1, width: 300, errorCorrectionLevel: 'M' });

module.exports = { newVerifyCode, ensureVerifyCode, verifyUrl, qrPng };
