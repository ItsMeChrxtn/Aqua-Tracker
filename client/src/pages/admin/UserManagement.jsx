import { useEffect, useState } from 'react';
import toast, { confirm } from '../../utils/notify';
import { userApi } from '../../api/misc';
import { apiErrorMessage } from '../../api/client';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import DataTable from '../../components/ui/DataTable';
import { Field, Input, Select } from '../../components/ui/FormField';
import { ROLE_LABEL } from '../../utils/format';
import IconButton from '../../components/ui/IconButton';

const ROLE_BADGE = {
  fishpond_owner: 'bg-sky-50 text-sky-700 border-sky-300',
  agriculture_staff: 'bg-violet-50 text-violet-700 border-violet-300',
  admin: 'bg-brand-50 text-brand-700 border-brand-300',
};

const EMPTY_FORM = { name: '', email: '', password: '', role: 'agriculture_staff', phone: '', barangay: '' };

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const load = () => {
    setLoading(true);
    userApi.list(roleFilter ? { role: roleFilter } : undefined).then(setUsers).finally(() => setLoading(false));
  };

  useEffect(load, [roleFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await userApi.create(form);
      toast.success('Account created');
      setModalOpen(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to create account'));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (user) => {
    try {
      await userApi.update(user._id, { status: user.status === 'active' ? 'inactive' : 'active' });
      toast.success(`Account ${user.status === 'active' ? 'deactivated' : 'activated'}`);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const removeUser = async (user) => {
    if (!(await confirm(`Delete account for ${user.name}?`))) return;
    try {
      await userApi.remove(user._id);
      toast.success('Account deleted');
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const submitReset = async (e) => {
    e.preventDefault();
    try {
      await userApi.resetPassword(resetTarget._id, newPassword);
      toast.success('Password reset');
      setResetTarget(null);
      setNewPassword('');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">User &amp; Role Management</h2>
        <div className="flex items-center gap-3">
          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-56">
            <option value="">All roles</option>
            <option value="fishpond_owner">Fishpond Owner</option>
            <option value="agriculture_staff">Agriculture Office Staff</option>
            <option value="admin">Administrator</option>
          </Select>
          <Button icon="plus" onClick={() => setModalOpen(true)}>New Account</Button>
        </div>
      </div>

      <Card padded={false}>
        <div className="p-2">
          <DataTable
            loading={loading}
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'email', header: 'Email' },
              { key: 'role', header: 'Role', render: (u) => <Badge className={ROLE_BADGE[u.role]}>{ROLE_LABEL[u.role]}</Badge> },
              { key: 'barangay', header: 'Barangay', render: (u) => u.barangay || '—' },
              { key: 'status', header: 'Status', render: (u) => <Badge className={u.status === 'active' ? 'bg-leaf-50 text-leaf-700 border-leaf-300' : 'bg-slate-50 text-slate-600 border-slate-300'}>{u.status}</Badge> },
              {
                key: 'actions',
                header: '',
                render: (u) => (
                  <div className="flex gap-1.5">
                    <IconButton icon="key" label="Reset Password" tone="brand" onClick={() => setResetTarget(u)} />
                    <IconButton
                      icon={u.status === 'active' ? 'userOff' : 'userOn'}
                      label={u.status === 'active' ? 'Deactivate' : 'Activate'}
                      tone={u.status === 'active' ? 'warning' : 'success'}
                      onClick={() => toggleStatus(u)}
                    />
                    <IconButton icon="trash" label="Delete" tone="danger" onClick={() => removeUser(u)} />
                  </div>
                ),
              },
            ]}
            rows={users}
            emptyMessage="No accounts found."
          />
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Account">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Full Name" required>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email" required>
            <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Temporary Password" required hint="At least 6 characters">
            <Input type="password" minLength={6} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <Field label="Role" required>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="agriculture_staff">Agriculture Office Staff</option>
              <option value="admin">Administrator</option>
              <option value="fishpond_owner">Fishpond Owner</option>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Barangay">
              <Input value={form.barangay} onChange={(e) => setForm({ ...form, barangay: e.target.value })} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create Account</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!resetTarget} onClose={() => setResetTarget(null)} title={`Reset password for ${resetTarget?.name}`}>
        <form onSubmit={submitReset} className="space-y-4">
          <Field label="New Password" required hint="At least 6 characters">
            <Input type="password" minLength={6} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setResetTarget(null)}>Cancel</Button>
            <Button type="submit">Reset Password</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
