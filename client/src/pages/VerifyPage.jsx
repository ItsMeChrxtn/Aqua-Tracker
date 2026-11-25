import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { assetUrl } from '../api/client';
import Icon from '../components/ui/Icon';
import FishpondPhoto from '../components/ui/FishpondPhoto';
import { formatArea, formatDate } from '../utils/format';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-900">{children || '—'}</span>
    </div>
  );
}

// Public page opened by scanning a registration's QR code. No login needed.
export default function VerifyPage() {
  const { code } = useParams();
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    // Plain axios: no login token and no loading/error pop-ups.
    axios
      .get(`${API_URL}/public/verify/${encodeURIComponent(code)}`)
      .then((res) => setState({ record: res.data.record }))
      .catch((err) => setState({ error: err?.response?.status === 404 ? 'not_found' : 'failed' }));
  }, [code]);

  const r = state.record;
  const valid = r?.valid;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-white px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-5 flex items-center justify-center gap-2 text-brand-700">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white">
            <Icon name="freshwater" className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-semibold">AquaTrack Verification</span>
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {state.loading && <p className="py-8 text-center text-sm text-slate-500">Checking registration…</p>}

          {state.error && (
            <div className="space-y-2 py-6 text-center">
              <Icon name="xCircle" className="mx-auto h-12 w-12 text-rose-500" />
              <p className="text-lg font-semibold text-slate-900">{state.error === 'not_found' ? 'Not a valid registration' : 'Could not check right now'}</p>
              <p className="text-sm text-slate-600">
                {state.error === 'not_found'
                  ? 'This QR code does not match any registration in AquaTrack. It may be fake or mistyped.'
                  : 'Please check your internet connection and try again.'}
              </p>
            </div>
          )}

          {r && (
            <div className="space-y-4">
              <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${valid ? 'bg-leaf-50 text-leaf-800' : 'bg-amber-50 text-amber-800'}`}>
                <Icon name={valid ? 'shieldCheck' : 'shieldAlert'} className="h-8 w-8 shrink-0" />
                <div>
                  <p className="font-semibold">{valid ? 'Verified — registered and approved' : 'Not currently approved'}</p>
                  <p className="text-xs">{r.type === 'fisherfolk' ? 'Municipal Fisherfolk Registration (FishR)' : 'Registered Fishpond'} · Municipality of Noveleta, Cavite</p>
                </div>
              </div>

              {r.type === 'fisherfolk' ? (
                <div className="flex gap-4">
                  {r.photoUrl && <img src={assetUrl(r.photoUrl)} alt="" className="h-24 w-24 shrink-0 rounded-lg object-cover" />}
                  <div className="min-w-0 flex-1 divide-y divide-slate-100">
                    <Row label="Name">{r.name}</Row>
                    <Row label="Registration No.">{r.registrationNo}</Row>
                    <Row label="Registered on">{r.registrationDate ? formatDate(r.registrationDate) : ''}</Row>
                    <Row label="Barangay">{r.barangay}</Row>
                  </div>
                </div>
              ) : (
                <div className="flex gap-4">
                  <FishpondPhoto alt="" className="h-24 w-24 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1 divide-y divide-slate-100">
                    <Row label="Fishpond">{r.name}</Row>
                    <Row label="Owner">{r.owner}</Row>
                    <Row label="Barangay">{r.barangay}</Row>
                    <Row label="Area">{r.areaSize ? formatArea(r.areaSize) : ''}</Row>
                    <Row label="Approved on">{r.approvedAt ? formatDate(r.approvedAt) : ''}</Row>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">Issued through AquaTrack for the Municipal Agriculture Office.</p>
      </div>
    </div>
  );
}
