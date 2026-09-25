import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import toast from '../../utils/notify';
import { useAuth } from '../../auth/AuthContext';
import { authApi } from '../../api/auth';
import { apiErrorMessage } from '../../api/client';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import { ROLE_HOME } from '../../utils/navConfig';
import AuthBrandPanel from './AuthBrandPanel';

const LENGTH = 6;
const RESEND_SECONDS = 60;

export default function VerifyEmailPage() {
  const { verifyEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const email = location.state?.email || params.get('email') || '';

  const [digits, setDigits] = useState(Array(LENGTH).fill(''));
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const inputs = useRef([]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  if (!email) return <Navigate to="/login" replace />;

  const submit = async (code) => {
    if (code.length !== LENGTH || submitting) return;
    setSubmitting(true);
    try {
      const user = await verifyEmail(email, code);
      navigate(ROLE_HOME[user.role], { replace: true });
      toast.success('Email verified! Register your first fishpond to get started.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Verification failed'));
      setDigits(Array(LENGTH).fill(''));
      inputs.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const fill = (start, text) => {
    const clean = text.replace(/\D/g, '');
    if (!clean) return;
    const next = [...digits];
    for (let i = 0; i < clean.length && start + i < LENGTH; i += 1) next[start + i] = clean[i];
    setDigits(next);
    const focusAt = Math.min(start + clean.length, LENGTH - 1);
    inputs.current[focusAt]?.focus();
    if (next.every(Boolean)) submit(next.join(''));
  };

  const onChange = (i) => (e) => {
    const value = e.target.value;
    if (!value) {
      const next = [...digits];
      next[i] = '';
      setDigits(next);
      return;
    }
    fill(i, value.slice(-1));
  };

  const onKeyDown = (i) => (e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft' && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < LENGTH - 1) inputs.current[i + 1]?.focus();
  };

  const onPaste = (i) => (e) => {
    e.preventDefault();
    fill(i, e.clipboardData.getData('text'));
  };

  const resend = async () => {
    try {
      await authApi.resendOtp(email);
      toast.success(`A new code was sent to ${email}.`);
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      if (err.response?.data?.retryAfter) setCooldown(err.response.data.retryAfter);
      toast.error(apiErrorMessage(err, 'Could not resend the code'));
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      <AuthBrandPanel
        heading="One last step."
        sub="We just need to confirm that your email address is really yours before you start using AquaTrack."
      />

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-7 flex flex-col items-center text-center lg:items-start lg:text-left">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Icon name="mail" className="h-6 w-6" />
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">Verify your email</h1>
            <p className="mt-1.5 text-sm text-slate-600">
              Enter the 6-digit code we sent to <span className="font-semibold text-slate-900">{email}</span>
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(digits.join(''));
            }}
            className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
          >
            <div className="flex justify-between gap-2">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => (inputs.current[i] = el)}
                  value={d}
                  onChange={onChange(i)}
                  onKeyDown={onKeyDown(i)}
                  onPaste={onPaste(i)}
                  inputMode="numeric"
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  maxLength={1}
                  aria-label={`Digit ${i + 1}`}
                  className="h-14 w-full min-w-0 rounded-xl border border-slate-300 text-center text-2xl font-bold text-slate-900 transition-shadow focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                />
              ))}
            </div>

            <Button type="submit" loading={submitting} disabled={digits.some((d) => !d)} className="w-full justify-center py-2.5">
              Verify Email
            </Button>

            <p className="text-center text-sm text-slate-600">
              Didn&apos;t get the code?{' '}
              {cooldown > 0 ? (
                <span className="text-slate-400">Resend in {cooldown}s</span>
              ) : (
                <button type="button" onClick={resend} className="font-semibold text-brand-600 hover:text-brand-700">
                  Resend code
                </button>
              )}
            </p>
            <p className="text-center text-xs text-slate-400">Check your spam or promotions folder if you can&apos;t find it.</p>
          </form>

          <Link to="/login" className="mt-5 flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-slate-600 lg:justify-start">
            <Icon name="arrowRight" className="h-3.5 w-3.5 rotate-180" /> Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
