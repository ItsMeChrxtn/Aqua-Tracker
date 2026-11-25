import { useEffect, useState } from 'react';
import toast, { confirm } from '../../utils/notify';
import { fisherfolkApi } from '../../api/fisherfolk';
import { apiErrorMessage } from '../../api/client';
import { downloadFile } from '../../utils/download';
import { formatDate } from '../../utils/format';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import FishpondPhoto from '../../components/ui/FishpondPhoto';
import { Field, Select, Textarea } from '../../components/ui/FormField';
import ApplicationSummary from '../../components/fisherfolk/ApplicationSummary';
import VerificationQr from '../../components/ui/VerificationQr';
import { APPLICATION_STATUS, REGISTRATION_TYPES, labelOf, fullName } from '../../utils/fisherfolk';


export default function FisherfolkApplications() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('pending');
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState('view'); // view | reject
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    return fisherfolkApi
      .list(status ? { status } : {})
      .then(setRows)
      .catch((err) => toast.error(apiErrorMessage(err, 'Failed to load applications')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const open = (a) => {
    setSelected(a);
    setMode('view');
    setReason('');
  };
  const close = () => setSelected(null);

  const approve = async () => {
    if (!(await confirm(`Fisherfolk application of ${fullName(selected)}`, { title: 'Do you want to approve this?', danger: false }))) return;
    setBusy(true);
    try {
      await fisherfolkApi.approve(selected._id, {});
      toast.success('Application approved');
      close();
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to approve'));
    } finally {
      setBusy(false);
    }
  };

  const reject = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await fisherfolkApi.reject(selected._id, reason);
      toast.success('Application returned to the owner for correction');
      close();
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to return the application'));
    } finally {
      setBusy(false);
    }
  };

  const pdf = (a) => downloadFile(fisherfolkApi.pdfUrl(a._id), 'FishR_Application.pdf').catch(() => {});

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Fisherfolk Registration</h2>
          <p className="text-sm text-slate-500">Applications for Municipal Fisherfolk Registration submitted by fishpond owners.</p>
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-52">
          <option value="">All submitted</option>
          <option value="pending">Under Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Returned for Correction</option>
        </Select>
      </div>

      <Card padded={false}>
        <div className="p-2">
          <DataTable
            loading={loading}
            columns={[
              {
                key: 'name',
                header: 'Applicant',
                value: (a) => `${fullName(a)} ${a.owner?.email || ''}`,
                render: (a) => (
                  <div className="flex items-center gap-3">
                    <FishpondPhoto src={a.photoUrl} alt="" className="h-10 w-10 rounded-full" />
                    <div>
                      <p className="font-semibold text-slate-900">{fullName(a)}</p>
                      <p className="text-xs text-slate-500">{a.owner?.email}</p>
                    </div>
                  </div>
                ),
              },
              { key: 'barangay', header: 'Barangay', value: (a) => a.address?.barangay, render: (a) => a.address?.barangay || '—' },
              { key: 'type', header: 'Type', value: (a) => labelOf(REGISTRATION_TYPES, a.registrationType), render: (a) => labelOf(REGISTRATION_TYPES, a.registrationType) || '—' },
              { key: 'submittedAt', header: 'Submitted', render: (a) => formatDate(a.submittedAt) },
              { key: 'registrationNo', header: 'Reg. No.', render: (a) => a.registrationNo || '—' },
              {
                key: 'status',
                header: 'Status',
                value: (a) => APPLICATION_STATUS[a.status]?.label,
                render: (a) => <Badge className={APPLICATION_STATUS[a.status]?.className}>{APPLICATION_STATUS[a.status]?.label}</Badge>,
              },
              {
                key: 'actions',
                header: '',
                render: (a) => (
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="secondary" icon="eye" onClick={() => open(a)}>
                      View
                    </Button>
                    <Button size="sm" variant="ghost" icon="download" onClick={() => pdf(a)} aria-label="Download PDF" />
                  </div>
                ),
              },
            ]}
            rows={rows}
            searchable="Search name, email, barangay…"
            emptyMessage={status === 'pending' ? 'No applications waiting for review.' : 'No applications found.'}
          />
        </div>
      </Card>

      <Modal open={!!selected} onClose={close} title={`Fisherfolk Application — ${fullName(selected)}`} width="max-w-3xl">
        {selected && mode === 'view' && (
          <div className="space-y-4">
            <ApplicationSummary application={selected} />
            {selected.status === 'rejected' && selected.remarks && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">Returned: {selected.remarks}</p>
            )}
            {selected.status === 'approved' && selected.verifyCode && (
              <VerificationQr code={selected.verifyCode} label="Verification QR" fileName={`fishr-${selected.registrationNo || 'qr'}`} />
            )}
            {selected.status === 'approved' && (
              <p className="text-xs text-slate-500">
                Reviewed by {selected.reviewedBy || '—'} · Certified by {selected.certifiedBy || '—'} · Approved by {selected.approvedBy || '—'}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <Button variant="secondary" icon="download" onClick={() => pdf(selected)}>
                Print PDF
              </Button>
              {selected.status === 'pending' && (
                <>
                  <Button variant="danger" icon="close" onClick={() => setMode('reject')}>
                    Return for Correction
                  </Button>
                  <Button variant="accent" icon="check" loading={busy} onClick={approve}>
                    Approve
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {selected && mode === 'reject' && (
          <form onSubmit={reject} className="space-y-4">
            <Field label="What needs to be corrected?" required>
              <Textarea required value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="e.g. Barangay Certification is not readable, please upload a clearer copy." />
            </Field>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <Button variant="secondary" onClick={() => setMode('view')}>Back</Button>
              <Button type="submit" variant="danger" loading={busy}>Return to Owner</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
