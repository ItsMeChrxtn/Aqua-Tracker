import { useState } from 'react';
import { confirm } from '../../utils/notify';
import Button from './Button';
import { Select } from './FormField';

const TYPE_LABEL = { excel: 'an Excel file', pdf: 'a PDF file' };

// Pick a file type, confirm, then export.
export default function ExportMenu({ onExport, loading, subject = 'this report' }) {
  const [type, setType] = useState('excel');

  const run = async () => {
    if (!(await confirm(`Download ${subject} as ${TYPE_LABEL[type]}?`, { title: 'Download report?', danger: false }))) return;
    onExport(type);
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={type} onChange={(e) => setType(e.target.value)} className="w-40" aria-label="Export file type">
        <option value="excel">Excel (.xlsx)</option>
        <option value="pdf">PDF (.pdf)</option>
      </Select>
      <Button variant="secondary" icon="download" loading={loading} onClick={run}>
        Export
      </Button>
    </div>
  );
}
