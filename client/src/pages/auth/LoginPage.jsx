import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../auth/AuthContext';
import { apiErrorMessage } from '../../api/client';
import { Field, Input } from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import { ROLE_HOME } from '../../utils/navConfig';
import AuthBrandPanel from './AuthBrandPanel';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      const redirectTo = location.state?.from?.pathname || ROLE_HOME[user.role] || '/';
      navigate(redirectTo, { replace: true });
      toast.success(`Welcome back, ${user.name}!`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      <AuthBrandPanel
        heading="Clear data for a better harvest."
        sub="Monitoring, harvest estimation, sales, and reports — all in one centralized system for your fishpond."
      />

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
            <Link to="/" className="mb-4 flex items-center gap-2.5 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-sm">
                <Icon name="freshwater" className="h-6 w-6 text-white" />
              </div>
            </Link>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">Welcome back</h1>
            <p className="mt-1.5 text-sm text-slate-600">Sign in to access your AquaTrack dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <Field label="Email address" required>
              <Input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
              />
            </Field>
            <Field label="Password" required>
              <Input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
              />
            </Field>
            <Button type="submit" loading={loading} className="w-full justify-center py-2.5">
              Sign In
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-600 lg:text-left">
            Fishpond operator?{' '}
            <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
              Register your account
            </Link>
          </p>
          <Link to="/" className="mt-3 flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-slate-600 lg:justify-start">
            <Icon name="arrowRight" className="h-3.5 w-3.5 rotate-180" /> Back to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
