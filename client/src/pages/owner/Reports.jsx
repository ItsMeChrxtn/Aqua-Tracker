import { useEffect, useState } from 'react';
import toast from '../../utils/notify';
import { reportApi } from '../../api/misc';
import { downloadFile } from '../../utils/download';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import ExportMenu from '../../components/ui/ExportMenu';
import CycleRecordsModal from '../../components/monitoring/CycleRecordsModal';
import Badge from '../../components/ui/Badge';
import DataTable from '../../components/ui/DataTable';
import Spinner from '../../components/ui/Spinner';
import { formatNumber, READINESS_LABEL, READINESS_BADGE_CLASS } from '../../utils/format';

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState('');
  const [query, setQuery] = useState('');
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    reportApi.ownerSummary().then(setData).finally(() => setLoading(false));
  }, []);

  const exportAs = async (type) => {
    setExporting(type);
    try {
      const params = query ? { q: query } : undefined;
      if (type === 'excel') await downloadFile(reportApi.exportExcelUrl(), 'aquatrack-production-report.xlsx', params);
      else await downloadFile(reportApi.exportPdfUrl(), 'aquatrack-production-report.pdf', params);
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
        <h2 className="text-lg font-semibold text-slate-900">Reports</h2>
        <ExportMenu onExport={exportAs} loading={!!exporting} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Total Sales Revenue" value={`₱${formatNumber(data.summary.totalSalesRevenue, 2)}`} icon="report" tone="emerald" />
        <StatCard label="Total Quantity Sold" value={`${formatNumber(data.summary.totalSalesQuantityKg, 1)} kg`} icon="fish" tone="brand" />
        <StatCard label="Revenue This Month" value={`₱${formatNumber(data.summary.salesRevenueThisMonth, 2)}`} icon="report" tone="sky" />
      </div>

      <Card title="Production Summary — All Fishponds" padded={false}>
        <div className="p-2">
          <DataTable
            columns={[
              { key: 'fishpondName', header: 'Fishpond' },
              { key: 'species', header: 'Species' },
              { key: 'stocked', header: 'Stocked', render: (r) => formatNumber(r.stocked) },
              { key: 'remaining', header: 'Remaining', render: (r) => formatNumber(r.remaining) },
              { key: 'survivalRate', header: 'Survival %' },
              { key: 'estimatedHarvestKg', header: 'Est. Harvest (kg)' },
              { key: 'readinessStatus', header: 'Status', value: (r) => READINESS_LABEL[r.readinessStatus], render: (r) => <Badge className={READINESS_BADGE_CLASS[r.readinessStatus]}>{READINESS_LABEL[r.readinessStatus]}</Badge> },
              {
                key: 'view',
                header: '',
                render: (r) => (
                  <Button size="sm" variant="secondary" onClick={() => setViewing(r)}>
                    View
                  </Button>
                ),
              },
            ]}
            rows={data.productionSummary}
            keyField="cycleId"
            searchable="Search fishpond, species, status…"
            query={query}
            onQueryChange={setQuery}
            emptyMessage="No active production cycles to report on yet."
          />
        </div>
      </Card>

      <CycleRecordsModal row={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
