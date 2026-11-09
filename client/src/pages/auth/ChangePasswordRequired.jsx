import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import toast from '../../utils/notify';
import { useAuth } from '../../auth/AuthContext';
import { authApi } from '../../api/auth';
import { apiErrorMessage } from '../../api/client';
import { Field, PasswordInput } from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import { ROLE_HOME } from '../../utils/navConfig';
import AuthBrandPanel from './AuthBrandPanel';
import { PASSWORD_MIN, PASSWORD_MAX, PASSWORD_HINT } from '../../utils/limits';

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' };

// Shown after signing in with an emailed temporary password (new staff
// account or admin reset). The rest of the app is locked until this is done.
export default function ChangePasswordRequired() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  if (!user.mustChangePassword) return <Navigate to={ROLE_HOME[user.role]} replace />;

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setSaving(true);
    try {
      await authApi.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      const fresh = await refreshUser();
      navigate(ROLE_HOME[fresh.role], { replace: true });
      toast.success('Password updated. You now have full access to AquaTrack.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to change password'));
    } finally {
      setSaving(false);
    }
  };

  const signOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-white">
      <AuthBrandPanel
        heading="Secure your account."
        sub="Your account was set up with a temporary password. Choose your own password to unlock the full system."
      />

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-7 flex flex-col items-center text-center lg:items-start lg:text-left">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Icon name="key" className="h-6 w-6" />
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">Set a new password</h1>
            <p className="mt-1.5 text-sm text-slate-600">
              Hi {user.name}, please replace the temporary password we emailed to{' '}
              <span className="font-semibold text-slate-900">{user.email}</span>.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <Field label="Temporary password" required hint="The password from your welcome email">
              <PasswordInput required autoComplete="current-password" value={form.currentPassword} onChange={update('currentPassword')} />
            </Field>
            <Field label="New password" required hint={PASSWORD_HINT}>
              <PasswordInput required minLength={PASSWORD_MIN} maxLength={PASSWORD_MAX} autoComplete="new-password" value={form.newPassword} onChange={update('newPassword')} />
            </Field>
            <Field label="Confirm new password" required>
              <PasswordInput required autoComplete="new-password" value={form.confirmPassword} onChange={update('confirmPassword')} />
            </Field>
            <Button type="submit" loading={saving} className="w-full justify-center py-2.5">
              Save New Password
            </Button>
          </form>

          <button type="button" onClick={signOut} className="mt-5 flex w-full items-center justify-center gap-1 text-xs text-slate-400 hover:text-slate-600 lg:justify-start">
            <Icon name="logout" className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
