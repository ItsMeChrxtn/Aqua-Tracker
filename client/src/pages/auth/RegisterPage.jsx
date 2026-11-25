import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from '../../utils/notify';
import { useAuth } from '../../auth/AuthContext';
import { apiErrorMessage } from '../../api/client';
import { Field, Input, PasswordInput, BarangaySelect } from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import AuthBrandPanel from './AuthBrandPanel';
import { PASSWORD_MAX } from '../../utils/limits';
import { isStrongPassword } from '../../utils/password';
import PasswordChecklist from '../../components/ui/PasswordChecklist';
import { FISHPOND_BARANGAYS } from '../../utils/barangays';

const hasLetters = (value) => !/^[0-9+() -]*$/.test(value);

const EMPTY = { firstName: '', lastName: '', email: '', password: '', confirmPassword: '', phone: '', barangay: '', address: '' };

const ACCOUNT_TYPES = [
  { value: 'fishpond_owner', label: 'Fishpond Owner', hint: 'Monitor my fishpond and sell my harvest', icon: 'fish' },
  { value: 'buyer', label: 'Buyer', hint: 'Buy fresh fish from local fishponds', icon: 'cart' },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [accountType, setAccountType] = useState(params.get('type') === 'buyer' ? 'buyer' : 'fishpond_owner');
  const isBuyer = accountType === 'buyer';
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const validateForm = () => {
    if (/\d/.test(form.firstName)) {
      toast.error('First name must not contain numbers');
      return false;
    }
    if (/\d/.test(form.lastName)) {
      toast.error('Surname must not contain numbers');
      return false;
    }
    if (form.phone && hasLetters(form.phone)) {
      toast.error('Phone number must contain numbers only');
      return false;
    }
    if (!isStrongPassword(form.password)) {
      toast.error('Your password does not meet all the requirements yet');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const { barangay, address, ...rest } = form;
      const res = await register({ ...rest, accountType, ...(isBuyer ? { address } : { barangay }) });
      toast.success(res.message);
      navigate('/verify-email', { state: { email: res.email } });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      <AuthBrandPanel
        heading={isBuyer ? 'Fresh fish, straight from Noveleta fishponds.' : 'Join small-scale fishpond operators going digital.'}
        sub={
          isBuyer
            ? 'Create a free buyer account to browse fish for sale, see the price per kilo, and order for pickup or delivery.'
            : 'Registration is free — your fishpond just needs approval from the Agriculture Office before you start monitoring.'
        }
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
            <p className="mt-1.5 text-sm text-slate-600">{isBuyer ? 'Buy fish from fishpond owners in Noveleta, Cavite' : 'For small-scale fishpond operators in Noveleta, Cavite'}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Account type">
              {ACCOUNT_TYPES.map((t) => (
                <button
                  type="button"
                  key={t.value}
                  role="radio"
                  aria-checked={accountType === t.value}
                  onClick={() => setAccountType(t.value)}
                  className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${
                    accountType === t.value ? 'border-brand-600 bg-brand-50' : 'border-slate-200 hover:border-brand-300'
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                    <Icon name={t.icon} className="h-4 w-4 text-brand-600" /> {t.label}
                  </span>
                  <span className="text-[11px] leading-snug text-slate-500">{t.hint}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name" required>
                <Input required value={form.firstName} onChange={update('firstName')} placeholder="Juan" autoComplete="given-name" />
              </Field>
              <Field label="Surname" required>
                <Input required value={form.lastName} onChange={update('lastName')} placeholder="Dela Cruz" autoComplete="family-name" />
              </Field>
            </div>
            <Field label="Email address" required>
              <Input type="email" required value={form.email} onChange={update('email')} placeholder="you@example.com" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone number">
                <Input inputMode="tel" maxLength={13} value={form.phone} onChange={update('phone')} placeholder="09171234567" />
              </Field>
              {!isBuyer && (
                <Field label="Barangay">
                  <BarangaySelect value={form.barangay} onChange={update('barangay')} options={FISHPOND_BARANGAYS} />
                </Field>
              )}
            </div>
            {isBuyer && (
              <Field label="Delivery address" hint="Optional — used when you order for delivery">
                <Input value={form.address} onChange={update('address')} maxLength={200} placeholder="House no., street, barangay, municipality" />
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Password" required>
                <PasswordInput required maxLength={PASSWORD_MAX} value={form.password} onChange={update('password')} />
              </Field>
              <Field label="Confirm password" required>
                <PasswordInput required value={form.confirmPassword} onChange={update('confirmPassword')} />
              </Field>
            </div>
            <PasswordChecklist password={form.password} />
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
