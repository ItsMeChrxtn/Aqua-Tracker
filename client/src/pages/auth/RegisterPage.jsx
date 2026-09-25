import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from '../../utils/notify';
import { useAuth } from '../../auth/AuthContext';
import { apiErrorMessage } from '../../api/client';
import { Field, Input } from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import { ROLE_HOME } from '../../utils/navConfig';
import AuthBrandPanel from './AuthBrandPanel';

const EMPTY = { name: '', email: '', password: '', confirmPassword: '', phone: '', barangay: '' };

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const user = await register(form);
      toast.success('Account created! Register your first fishpond to get started.');
      navigate(ROLE_HOME[user.role], { replace: true });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      <AuthBrandPanel
        heading="Join small-scale fishpond operators going digital."
        sub="Registration is free — your fishpond just needs approval from the Agriculture Office before you start monitoring."
      />

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-7 flex flex-col items-center text-center lg:items-start lg:text-left">
            <Link to="/" className="mb-4 flex items-center gap-2.5 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-sm">
                <Icon name="freshwater" className="h-6 w-6 text-white" />
              </div>
            </Link>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">Create your AquaTrack account</h1>
            <p className="mt-1.5 text-sm text-slate-600">For small-scale fishpond operators in Noveleta, Cavite</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <Field label="Full name" required>
              <Input required value={form.name} onChange={update('name')} placeholder="Juan Dela Cruz" />
            </Field>
            <Field label="Email address" required>
              <Input type="email" required value={form.email} onChange={update('email')} placeholder="you@example.com" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone number">
                <Input value={form.phone} onChange={update('phone')} placeholder="09171234567" />
              </Field>
              <Field label="Barangay">
                <Input value={form.barangay} onChange={update('barangay')} placeholder="San Rafael" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Password" required hint="At least 6 characters">
                <Input type="password" required minLength={6} value={form.password} onChange={update('password')} />
              </Field>
              <Field label="Confirm password" required>
                <Input type="password" required value={form.confirmPassword} onChange={update('confirmPassword')} />
              </Field>
            </div>
            <Button type="submit" loading={loading} className="w-full justify-center py-2.5">
              Create Account
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-600 lg:text-left">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
              Sign in
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
