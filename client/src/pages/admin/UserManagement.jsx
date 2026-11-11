import { useEffect, useState } from 'react';
import toast, { confirm } from '../../utils/notify';
import { userApi } from '../../api/misc';
import { apiErrorMessage } from '../../api/client';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import DataTable from '../../components/ui/DataTable';
import { Field, Input, Select, BarangaySelect } from '../../components/ui/FormField';
import { ROLE_LABEL } from '../../utils/format';
import IconButton from '../../components/ui/IconButton';

const ROLE_BADGE = {
  fishpond_owner: 'bg-sky-50 text-sky-700 border-sky-300',
  agriculture_staff: 'bg-violet-50 text-violet-700 border-violet-300',
  admin: 'bg-brand-50 text-brand-700 border-brand-300',
};

const EMPTY_FORM = { name: '', email: '', role: 'agriculture_staff', phone: '', barangay: '' };

const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Fallback when the email service fails: show the admin the temporary
// password so they can hand it over another way.
function showTempPassword(title, user, tempPassword) {
  toast.info(
    title,
    `Give these login details to <b>${escapeHtml(user.name)}</b>:<br><br>
     Email: <b>${escapeHtml(user.email)}</b><br>
     Temporary password: <code style="font-size:16px;font-weight:700">${escapeHtml(tempPassword)}</code><br><br>
     <small>They will be asked to set a new password when they sign in.</small>`
  );
}

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    userApi.list(roleFilter ? { role: roleFilter } : undefined).then(setUsers).finally(() => setLoading(false));
  };

  useEffect(load, [roleFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await userApi.create(form);
      if (res.emailSent) toast.success(`Account created. Login details were emailed to ${res.user.email}.`);
      else showTempPassword('Account created, but the email could not be sent', res.user, res.tempPassword);
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

  const resetPassword = async (user) => {
    const ok = await confirm(`A new temporary password will be emailed to ${user.email}, and they must change it on their next sign-in.`, {
      title: `Reset password for ${user.name}?`,
      confirmLabel: 'Yes, reset it',
    });
    if (!ok) return;
    try {
      const res = await userApi.resetPassword(user._id);
      if (res.emailSent) toast.success(`A new temporary password was emailed to ${user.email}.`);
      else showTempPassword('Password reset, but the email could not be sent', user, res.tempPassword);
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
              { key: 'role', header: 'Role', value: (u) => ROLE_LABEL[u.role], render: (u) => <Badge className={ROLE_BADGE[u.role]}>{ROLE_LABEL[u.role]}</Badge> },
              { key: 'barangay', header: 'Barangay', render: (u) => u.barangay || '—' },
              { key: 'status', header: 'Status', render: (u) => <Badge className={u.status === 'active' ? 'bg-leaf-50 text-leaf-700 border-leaf-300' : 'bg-slate-50 text-slate-600 border-slate-300'}>{u.status}</Badge> },
              {
                key: 'actions',
                header: '',
                render: (u) => (
                  <div className="flex gap-1.5">
                    <IconButton icon="key" label="Reset Password" tone="brand" onClick={() => resetPassword(u)} />
                    {(u.role !== 'admin' || u.status !== 'active') && (
                      <IconButton
                        icon={u.status === 'active' ? 'userOff' : 'userOn'}
                        label={u.status === 'active' ? 'Deactivate' : 'Activate'}
                        tone={u.status === 'active' ? 'warning' : 'success'}
                        onClick={() => toggleStatus(u)}
                      />
                    )}
                    <IconButton icon="trash" label="Delete" tone="danger" onClick={() => removeUser(u)} />
                  </div>
                ),
              },
            ]}
            rows={users}
            searchable="Search name, email…"
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
              <BarangaySelect value={form.barangay} onChange={(e) => setForm({ ...form, barangay: e.target.value })} />
            </Field>
          </div>
          <p className="rounded-xl bg-brand-50 px-3.5 py-2.5 text-xs text-brand-700">
            A temporary password will be generated and emailed to this address. They must set their own password on first sign-in.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create Account</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
