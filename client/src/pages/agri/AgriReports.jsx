import { useEffect, useMemo, useState } from 'react';
import toast from '../../utils/notify';
import { reportApi } from '../../api/misc';
import { useSpeciesList } from '../../hooks/useSpeciesList';
import { Select } from '../../components/ui/FormField';
import SpeciesFilterSelect from '../../components/charts/SpeciesFilterSelect';
import { FISHPOND_BARANGAYS } from '../../utils/barangays';
import { downloadFile } from '../../utils/download';
import Card from '../../components/ui/Card';
import ExportMenu from '../../components/ui/ExportMenu';
import Badge from '../../components/ui/Badge';
import DataTable from '../../components/ui/DataTable';
import Spinner from '../../components/ui/Spinner';
import { formatDate, formatNumber, READINESS_LABEL, READINESS_BADGE_CLASS } from '../../utils/format';

export default function AgriReports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState('');
  const [query, setQuery] = useState('');
  const { species } = useSpeciesList();
  const [barangay, setBarangay] = useState('');
  const [speciesId, setSpeciesId] = useState('');
  const [readiness, setReadiness] = useState('');

  useEffect(() => {
    const params = {};
    if (barangay) params.barangay = barangay;
    if (speciesId) params.speciesId = speciesId;
    reportApi.municipalSummary(params).then(setData).finally(() => setLoading(false));
  }, [barangay, speciesId]);

  const rows = useMemo(
    () => (data ? data.allCycles.filter((c) => !readiness || c.readinessStatus === readiness) : []),
    [data, readiness]
  );

  const exportAs = async (type) => {
    setExporting(type);
    try {
      const params = {};
      if (query) params.q = query;
      if (barangay) params.barangay = barangay;
      if (speciesId) params.speciesId = speciesId;
      if (type === 'excel') await downloadFile(reportApi.exportExcelUrl(), 'aquatrack-municipal-report.xlsx', params);
      else await downloadFile(reportApi.exportPdfUrl(), 'aquatrack-municipal-report.pdf', params);
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
        <ExportMenu onExport={exportAs} loading={!!exporting} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={barangay} onChange={(e) => setBarangay(e.target.value)} className="w-48">
          <option value="">All barangays</option>
          {FISHPOND_BARANGAYS.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </Select>
        <SpeciesFilterSelect species={species} value={speciesId} onChange={setSpeciesId} />
        <Select value={readiness} onChange={(e) => setReadiness(e.target.value)} className="w-44">
          <option value="">All statuses</option>
          {Object.entries(READINESS_LABEL).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </Select>
      </div>

      <Card title={`All Active Production Cycles (${rows.length})`} padded={false}>
        <div className="p-2">
          <DataTable
            columns={[
              { key: 'fishpondName', header: 'Fishpond' },
              { key: 'owner', header: 'Owner' },
              { key: 'barangay', header: 'Barangay' },
              { key: 'species', header: 'Species' },
              { key: 'stockingDate', header: 'Stocking Date', render: (r) => formatDate(r.stockingDate) },
              { key: 'totalStocked', header: 'Stocked', render: (r) => formatNumber(r.totalStocked) },
              { key: 'survivalRate', header: 'Survival %' },
              { key: 'estimatedHarvestKg', header: 'Est. Harvest (kg)' },
              { key: 'readinessStatus', header: 'Status', value: (r) => READINESS_LABEL[r.readinessStatus], render: (r) => <Badge className={READINESS_BADGE_CLASS[r.readinessStatus]}>{READINESS_LABEL[r.readinessStatus]}</Badge> },
            ]}
            rows={rows}
            keyField="cycleId"
            searchable="Search fishpond, owner, barangay, species…"
            query={query}
            onQueryChange={setQuery}
            emptyMessage="No active production cycles match these filters."
          />
        </div>
      </Card>
    </div>
  );
}
