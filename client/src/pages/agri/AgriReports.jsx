import { useEffect, useState } from 'react';
import toast from '../../utils/notify';
import { reportApi } from '../../api/misc';
import { downloadFile } from '../../utils/download';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import DataTable from '../../components/ui/DataTable';
import Spinner from '../../components/ui/Spinner';
import { formatDate, formatNumber, READINESS_LABEL, READINESS_BADGE_CLASS } from '../../utils/format';

export default function AgriReports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState('');

  useEffect(() => {
    reportApi.municipalSummary().then(setData).finally(() => setLoading(false));
  }, []);

  const exportAs = async (type) => {
    setExporting(type);
    try {
      if (type === 'excel') await downloadFile(reportApi.exportExcelUrl(), 'aquatrack-municipal-report.xlsx');
      else await downloadFile(reportApi.exportPdfUrl(), 'aquatrack-municipal-report.pdf');
      toast.success('Report downloaded');
    } catch (err) {
      if (!err?.handled) toast.error('Export failed');
    } finally {
      setExporting('');
    }
  };

  if (loading) return <Spinner />;
  if (!data) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Municipal Reports</h2>
        <div className="flex gap-2">
          <Button variant="secondary" icon="download" loading={exporting === 'excel'} onClick={() => exportAs('excel')}>Export Excel</Button>
          <Button variant="secondary" icon="download" loading={exporting === 'pdf'} onClick={() => exportAs('pdf')}>Export PDF</Button>
        </div>
      </div>

      <Card title={`All Active Production Cycles (${data.allCycles.length})`} padded={false}>
        <div className="p-2">
          <DataTable
            columns={[
              { key: 'fishpondName', header: 'Fishpond' },
              { key: 'owner', header: 'Owner' },
              { key: 'barangay', header: 'Barangay' },
              { key: 'species', header: 'Species' },
              { key: 'stockingDate', header: 'Stocking Date', render: (r) => formatDate(r.stockingDate) },
              { key: 'initialCount', header: 'Stocked', render: (r) => formatNumber(r.initialCount) },
              { key: 'survivalRate', header: 'Survival %' },
              { key: 'estimatedHarvestKg', header: 'Est. Harvest (kg)' },
              { key: 'readinessStatus', header: 'Status', render: (r) => <Badge className={READINESS_BADGE_CLASS[r.readinessStatus]}>{READINESS_LABEL[r.readinessStatus]}</Badge> },
            ]}
            rows={data.allCycles}
            keyField="cycleId"
            emptyMessage="No active production cycles yet."
          />
        </div>
      </Card>
    </div>
  );
}
