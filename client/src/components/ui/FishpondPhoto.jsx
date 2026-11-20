import { useState } from 'react';
import { assetUrl } from '../../api/client';
import Icon from './Icon';

// Fishpond photo that falls back to a fish icon when there is no photo or the
// uploaded file can no longer be loaded.
export default function FishpondPhoto({ src, alt, className = '', fit = 'cover' }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 text-slate-400 ${className}`}>
        <Icon name="fish" className="h-6 w-6" />
      </div>
    );
  }
  return <img src={assetUrl(src)} alt={alt} onError={() => setFailed(true)} className={`${fit === 'contain' ? 'object-contain' : 'object-cover'} ${className}`} />;
}
