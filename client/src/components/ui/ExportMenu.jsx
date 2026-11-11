import { useState } from 'react';
import Button from './Button';
import { Select } from './FormField';

// Pick a file type, then export.
export default function ExportMenu({ onExport, loading }) {
  const [type, setType] = useState('excel');
  return (
    <div className="flex items-center gap-2">
      <Select value={type} onChange={(e) => setType(e.target.value)} className="w-40" aria-label="Export file type">
        <option value="excel">Excel (.xlsx)</option>
        <option value="pdf">PDF (.pdf)</option>
      </Select>
      <Button variant="secondary" icon="download" loading={loading} onClick={() => onExport(type)}>
        Export
      </Button>
    </div>
  );
}
