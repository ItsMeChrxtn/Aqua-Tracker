import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Icon from './Icon';

const verifyLink = (code) => `${window.location.origin}/verify/${code}`;

// QR code that opens the public verification page of an approved record.
export default function VerificationQr({ code, label = 'Scan to verify', fileName = 'aquatrack-qr' }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    if (!code) return;
    QRCode.toDataURL(verifyLink(code), { margin: 1, width: 360, errorCorrectionLevel: 'M' }).then(setSrc).catch(() => setSrc(''));
  }, [code]);

  if (!code || !src) return null;
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-3">
      <img src={src} alt="Verification QR code" className="h-28 w-28 shrink-0 rounded-lg" />
      <div className="min-w-0 space-y-1.5 text-xs text-slate-600">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
          <Icon name="shieldCheck" className="h-4 w-4 text-leaf-600" /> {label}
        </p>
        <p>Anyone can scan this to confirm the registration is genuine and approved.</p>
        <a href={verifyLink(code)} target="_blank" rel="noreferrer" className="block truncate text-brand-600 hover:underline">
          {verifyLink(code)}
        </a>
        <a href={src} download={`${fileName}.png`} className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
          <Icon name="download" className="h-3.5 w-3.5" /> Download QR
        </a>
      </div>
    </div>
  );
}
