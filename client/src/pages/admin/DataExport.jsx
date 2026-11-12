import { useState } from 'react';
import toast, { confirm } from '../../utils/notify';
import { adminApi, reportApi } from '../../api/misc';
import { downloadFile } from '../../utils/download';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';

export default function DataExport() {
  const [busy, setBusy] = useState('');

  const run = async (key, fn, question) => {
    if (!(await confirm(question, { title: 'Download this file?', danger: false }))) return;
    setBusy(key);
    try {
      await fn();
      toast.success('Download started');
    } catch (err) {
      if (!err?.handled) toast.error('Export failed');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-slate-900">Data Export / Backup</h2>

      <Card title="Full Data Backup">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Icon name="download" className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-slate-700">
              Downloads a complete JSON export of all users, species, fishponds, production cycles, monitoring records, inventory, and sales.
              Use this as a manual backup snapshot — AquaTrack does not run automated backup infrastructure.
            </p>
            <Button
              className="mt-3"
              icon="download"
              loading={busy === 'backup'}
              onClick={() => run('backup', () => downloadFile(adminApi.backupUrl(), `aquatrack-backup-${Date.now()}.json`), 'This downloads a full JSON backup of all AquaTrack data.')}
            >
              Download Full Backup (JSON)
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Production Report Exports">
        <p className="text-sm text-slate-700">Municipality-wide production report, same data shown in Municipal Reports.</p>
        <div className="mt-3 flex gap-2">
          <Button
            variant="secondary"
            icon="download"
            loading={busy === 'excel'}
            onClick={() => run('excel', () => downloadFile(reportApi.exportExcelUrl(), 'aquatrack-production-report.xlsx'), 'This downloads the production report as an Excel file.')}
          >
            Export Excel
          </Button>
          <Button
            variant="secondary"
            icon="download"
            loading={busy === 'pdf'}
            onClick={() => run('pdf', () => downloadFile(reportApi.exportPdfUrl(), 'aquatrack-production-report.pdf'), 'This downloads the production report as a PDF file.')}
          >
            Export PDF
          </Button>
        </div>
      </Card>
    </div>
  );
}
