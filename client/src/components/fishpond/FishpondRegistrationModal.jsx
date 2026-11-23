import { assetUrl } from '../../api/client';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import Icon from '../ui/Icon';
import IconButton from '../ui/IconButton';
import FishpondPhoto from '../ui/FishpondPhoto';
import { formatArea, formatCapacity, formatDate, STATUS_BADGE_CLASS } from '../../utils/format';

const isImage = (url) => /\.(png|jpe?g|webp|gif)$/i.test(url || '');

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-sm">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{children || '—'}</span>
    </div>
  );
}

// One registration document (MOA or SPA): a thumbnail for photos, a file
// link for PDF / Word files.
function DocumentCard({ title, url, name, required }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="mb-2 text-xs font-semibold text-slate-700">
        {title} {required && <span className="text-rose-500">*</span>}
      </p>
      {!url ? (
        <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-xs text-slate-400">Not submitted</p>
      ) : (
        <a href={assetUrl(url)} target="_blank" rel="noreferrer" className="group block" title="Open in a new tab">
          {isImage(url) ? (
            <img src={assetUrl(url)} alt={title} className="h-32 w-full rounded-lg bg-slate-100 object-contain transition group-hover:opacity-80" />
          ) : (
            <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-lg bg-slate-50 text-slate-500 transition group-hover:bg-brand-50 group-hover:text-brand-700">
              <Icon name="clipboard" className="h-7 w-7" />
              <span className="line-clamp-2 break-all px-2 text-center text-xs">{name || 'Open document'}</span>
            </div>
          )}
          <span className="mt-1.5 block text-center text-[11px] font-medium text-brand-600 group-hover:underline">Open ↗</span>
        </a>
      )}
    </div>
  );
}

// Everything the owner submitted when registering a fishpond, with the
// approve / reject actions while it is still pending.
export default function FishpondRegistrationModal({ fishpond, onClose, onApprove, onReject, busy }) {
  return (
    <Modal open={!!fishpond} onClose={onClose} title="Fishpond Registration" width="max-w-3xl">
      {fishpond && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FishpondPhoto src={fishpond.imageUrl} alt={fishpond.name} fit="contain" className="h-56 w-full rounded-xl bg-slate-100" />
            <div className="divide-y divide-slate-100">
              <Row label="Fishpond">{fishpond.name}</Row>
              <Row label="Barangay">{fishpond.barangay}</Row>
              <Row label="Address">{fishpond.address}</Row>
              <Row label="Area">{formatArea(fishpond.areaSize)}</Row>
              <Row label="Capacity">{formatCapacity(fishpond.capacity)}</Row>
              <Row label="Registered">{formatDate(fishpond.createdAt)}</Row>
              <Row label="Status">
                <Badge className={STATUS_BADGE_CLASS[fishpond.status]}>{fishpond.status}</Badge>
              </Row>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-3">
            <p className="mb-1 text-xs font-semibold text-slate-700">Owner</p>
            <div className="grid gap-x-6 sm:grid-cols-2">
              <Row label="Name">{fishpond.owner?.name}</Row>
              <Row label="Email">{fishpond.owner?.email}</Row>
              <Row label="Phone">{fishpond.owner?.phone}</Row>
              <Row label="Barangay">{fishpond.owner?.barangay}</Row>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <DocumentCard title="MOA — Memorandum of Agreement" url={fishpond.moaUrl} name={fishpond.moaName} required />
            <DocumentCard title="SPA — Special Power of Attorney" url={fishpond.spaUrl} name={fishpond.spaName} />
          </div>

          {fishpond.status === 'approved' && fishpond.approvedBy?.name && (
            <p className="text-xs text-slate-500">
              Approved by {fishpond.approvedBy.name}
              {fishpond.approvedAt ? ` on ${formatDate(fishpond.approvedAt)}` : ''}.
            </p>
          )}
          {fishpond.status === 'rejected' && fishpond.rejectionReason && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">Rejected: {fishpond.rejectionReason}</p>
          )}

          {fishpond.status === 'pending' && (
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-3">
              <Badge className={STATUS_BADGE_CLASS.pending}>pending</Badge>
              <IconButton icon="check" label="Approve" tone="success" loading={busy} onClick={() => onApprove(fishpond)} />
              <IconButton icon="close" label="Reject" tone="danger" onClick={() => onReject(fishpond)} />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
