import { useState } from 'react';
import toast from '../../utils/notify';
import { useAuth } from '../../auth/AuthContext';
import { authApi } from '../../api/auth';
import { apiErrorMessage } from '../../api/client';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/FormField';

export default function ProfileSettings() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({ name: user.name, phone: user.phone || '', barangay: user.barangay || '' });
  const [savingProfile, setSavingProfile] = useState(false);

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingPw, setSavingPw] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await authApi.updateProfile(form);
      await refreshUser();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to update profile'));
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (pw.newPassword !== pw.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setSavingPw(true);
    try {
      await authApi.changePassword({ currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      toast.success('Password changed');
      setPw({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to change password'));
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h2 className="text-lg font-semibold text-slate-900">Profile Settings</h2>

      <Card title="Personal Information">
        <form onSubmit={saveProfile} className="space-y-4">
          <Field label="Full Name" required>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input value={user.email} disabled />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Barangay">
              <Input value={form.barangay} onChange={(e) => setForm({ ...form, barangay: e.target.value })} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={savingProfile}>Save Changes</Button>
          </div>
        </form>
      </Card>

      <Card title="Change Password">
        <form onSubmit={savePassword} className="space-y-4">
          <Field label="Current Password" required>
            <Input type="password" required value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="New Password" required hint="At least 6 characters">
              <Input type="password" minLength={6} required value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
            </Field>
            <Field label="Confirm New Password" required>
              <Input type="password" required value={pw.confirmPassword} onChange={(e) => setPw({ ...pw, confirmPassword: e.target.value })} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={savingPw}>Change Password</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
