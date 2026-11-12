import { useEffect, useState } from 'react';
import { settingsApi } from '../api/misc';
import { Link } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import Button from '../components/ui/Button';
import Reveal from '../components/ui/Reveal';
import WaveDivider from '../components/landing/WaveDivider';

const FEATURES = [
  { icon: 'fish', title: 'Fishpond & Production Monitoring', desc: 'Track every fishpond and production cycle from one centralized dashboard.', tone: 'brand' },
  { icon: 'growth', title: 'Growth & Survival Tracking', desc: 'Log weight samples and watch growth and survival trends update automatically.', tone: 'leaf' },
  { icon: 'harvest', title: 'Harvest Estimation', desc: 'Get an automatic, data-driven estimate of your expected harvest yield.', tone: 'clay' },
  { icon: 'sales', title: 'Sales Management', desc: 'Record every sale — buyer, quantity, price — and track revenue per fishpond.', tone: 'leaf' },
  { icon: 'inventory', title: 'Inventory & Resources', desc: 'Monitor feed and supplies, with automatic alerts when stock runs low.', tone: 'clay' },
  { icon: 'analytics', title: 'Reports & Analytics', desc: 'Generate clean, exportable reports in PDF or Excel in a single click.', tone: 'brand' },
];

const TONE_GRADIENT = {
  brand: 'from-brand-400 to-brand-600',
  leaf: 'from-leaf-400 to-leaf-600',
  clay: 'from-leaf-400 to-leaf-600',
};

const STEPS = [
  { n: '01', title: 'Register', desc: 'Create an account and register your fishpond in a few minutes.' },
  { n: '02', title: 'Get approved', desc: 'The Agriculture Office reviews and approves your fishpond registration.' },
  { n: '03', title: 'Log your records', desc: 'Track feeding, growth, and mortality as part of your routine.' },
  { n: '04', title: 'Get insights', desc: 'View harvest estimates, sales summaries, and reports whenever you need them.' },
];

function RippleRings({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 400 400" fill="none">
      {[50, 95, 140, 185, 230].map((r) => (
        <circle key={r} cx="200" cy="200" r={r} stroke="white" strokeOpacity="0.08" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

function DashboardPreview() {
  const tiles = [
    ['Stocked', '12,400'],
    ['Survival', '94%'],
    ['Est. Harvest', '1,860 kg'],
  ];
  return (
    <div className="shadow-elegant relative rounded-2xl border border-white/20 bg-white p-4 sm:p-5">
      <span className="absolute -right-3 -top-3 rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-600 shadow-sm">
        Sample data
      </span>
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-3">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-leaf-500" />
        <span className="ml-2 text-[11px] font-semibold text-slate-400">San Rafael Fishpond — Overview</span>
      </div>
      <div className="mt-3.5 grid grid-cols-3 gap-2.5">
        {tiles.map(([l, v]) => (
          <div key={l} className="rounded-lg border border-slate-200 bg-white p-2.5">
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{l}</p>
            <p className="font-display mt-1 text-sm font-semibold text-slate-900">{v}</p>
          </div>
        ))}
      </div>
      <div className="mt-2.5 rounded-lg border border-slate-200 bg-white p-3">
        <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">Growth Trend</p>
        <svg viewBox="0 0 240 60" className="h-14 w-full" preserveAspectRatio="none">
          <polyline
            points="0,48 40,42 80,44 120,26 160,28 200,12 240,8"
            fill="none"
            stroke="url(#previewLine)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient id="previewLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1c6e6e" />
              <stop offset="100%" stopColor="#2f8546" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-leaf-200 bg-leaf-50 px-3 py-2">
        <Icon name="success" className="h-3.5 w-3.5 shrink-0 text-leaf-600" />
        <p className="text-[11px] font-medium text-leaf-700">Nearing harvest weight — 12 days to go</p>
      </div>
    </div>
  );
}

function NavBar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 border-b bg-white/90 backdrop-blur transition-all duration-300 ${
        scrolled ? 'border-slate-300 shadow-md' : 'border-transparent shadow-none'
      }`}
    >
      <div className={`mx-auto flex max-w-6xl items-center justify-between px-5 transition-all duration-300 sm:px-8 ${scrolled ? 'py-2.5' : 'py-3.5'}`}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-sm">
            <Icon name="freshwater" className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-[18px] font-semibold tracking-tight text-slate-900">AquaTrack</span>
        </div>
        <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-700 md:flex">
          <a href="#features" className="transition-colors hover:text-brand-600">Features</a>
          <a href="#how-it-works" className="transition-colors hover:text-brand-600">How It Works</a>
          <a href="#who" className="transition-colors hover:text-brand-600">Who It's For</a>
        </nav>
        <div className="hidden items-center gap-2.5 md:flex">
          <Link to="/login">
            <Button variant="secondary" size="sm">Sign In</Button>
          </Link>
          <Link to="/register">
            <Button variant="accent" size="sm">Register Now</Button>
          </Link>
        </div>
        <button onClick={() => setOpen((o) => !o)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-50 md:hidden">
          <Icon name={open ? 'close' : 'menu'} className="h-5 w-5" />
        </button>
      </div>
      {open && (
        <div className="border-t border-slate-300 bg-white px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-3 text-sm font-semibold text-slate-700">
            <a href="#features" onClick={() => setOpen(false)}>Features</a>
            <a href="#how-it-works" onClick={() => setOpen(false)}>How It Works</a>
            <a href="#who" onClick={() => setOpen(false)}>Who It's For</a>
          </nav>
          <div className="mt-4 flex gap-2.5">
            <Link to="/login" className="flex-1"><Button variant="secondary" size="sm" className="w-full justify-center">Sign In</Button></Link>
            <Link to="/register" className="flex-1"><Button variant="accent" size="sm" className="w-full justify-center">Register</Button></Link>
          </div>
        </div>
      )}
    </header>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <NavBar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-800 to-slate-900">
        <RippleRings className="pointer-events-none absolute -bottom-24 -right-24 h-[30rem] w-[30rem]" />

        <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-20 sm:px-8 sm:pt-24">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-8">
            <div className="text-center lg:text-left">
              <span className="animate-fade-in-up eyebrow justify-center text-brand-100 lg:justify-start">
                Aquaculture Monitoring System
              </span>
              <h1
                className="animate-fade-in-up font-display mt-6 text-[2.5rem] font-semibold leading-[1.12] tracking-tight text-white sm:text-5xl"
                style={{ animationDelay: '100ms' }}
              >
                Run your{' '}
                <span className="relative inline-block whitespace-nowrap">
                  fishpond
                  <svg
                    className="absolute -bottom-2 left-0 h-3 w-full text-leaf-400 sm:-bottom-3"
                    viewBox="0 0 200 14"
                    preserveAspectRatio="none"
                    fill="none"
                  >
                    <path
                      d="M2 10 C 40 2, 70 2, 100 7 C 130 12, 160 12, 198 4"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>{' '}
                on data, not guesswork
              </h1>
              <p className="animate-fade-in-up mx-auto mt-6 max-w-lg text-base leading-relaxed text-brand-50 lg:mx-0" style={{ animationDelay: '200ms' }}>
                One centralized system for growth monitoring, mortality tracking, harvest estimation, and sales — replacing manual notebooks and spreadsheets.
              </p>
              <div className="animate-fade-in-up mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start" style={{ animationDelay: '300ms' }}>
                <Link to="/register">
                  <Button variant="accent" className="w-full px-6 py-3 text-[15px] sm:w-auto">
                    Register Your Fishpond
                    <Icon name="arrowRight" className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="#features">
                  <Button variant="secondary" className="w-full border-white/30 bg-white/10 px-6 py-3 text-[15px] text-white hover:bg-white/20 sm:w-auto">
                    View Features
                  </Button>
                </a>
              </div>
              <div className="animate-fade-in-up mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-brand-50 lg:justify-start" style={{ animationDelay: '400ms' }}>
                <span className="inline-flex items-center gap-1.5"><Icon name="mobile" className="h-3.5 w-3.5 text-leaf-300" /> Works on any device</span>
                <span className="inline-flex items-center gap-1.5"><Icon name="clipboard" className="h-3.5 w-3.5 text-leaf-300" /> 100% paperless</span>
                <span className="inline-flex items-center gap-1.5"><Icon name="download" className="h-3.5 w-3.5 text-brand-200" /> PDF/Excel export</span>
              </div>
            </div>

            <div className="animate-fade-in-up mx-auto w-full max-w-sm lg:mx-0 lg:max-w-none" style={{ animationDelay: '250ms' }}>
              <DashboardPreview />
            </div>
          </div>
        </div>

        <WaveDivider fill="#fbf7f0" />
      </section>

      {/* Problem / Solution */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <Reveal className="hover-lift shadow-elegant rounded-2xl border border-slate-200 bg-white p-8">
              <span className="eyebrow text-rose-500">The Problem</span>
              <h2 className="font-display mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.9rem]">Manual record-keeping is a costly risk</h2>
              <p className="mt-4 leading-relaxed text-slate-700">
                Most small-scale fishpond operators still rely on notebooks or spreadsheets to track stocking, mortality, and harvest. These records are easy to lose or damage, and manual computation is error-prone — especially when estimating harvest and survival rate.
              </p>
              <ul className="mt-6 space-y-3">
                {['Records that get lost or damaged', 'Frequent errors in manual computation', 'No reliable harvest estimate', 'Reports that take too long to prepare'].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-500">
                      <Icon name="xCircle" className="h-3.5 w-3.5" />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={150} className="hover-lift shadow-elegant rounded-2xl border border-slate-200 bg-white p-8">
              <span className="eyebrow text-leaf-600">The Solution</span>
              <h2 className="font-display mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.9rem]">Centralized, accurate, and easy to use</h2>
              <p className="mt-4 leading-relaxed text-slate-700">
                AquaTrack records, analyzes, and reports every activity in your fishpond through a single web-based platform — accessible from any device with an internet connection.
              </p>
              <ul className="mt-6 space-y-3">
                {['Secure, centralized data storage', 'Automated harvest estimation', 'Real-time alerts for mortality and low stock', 'One-click PDF and Excel export'].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-leaf-100 text-leaf-600">
                      <Icon name="check" className="h-3.5 w-3.5" />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-gradient-to-b from-slate-50 to-white py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <Reveal className="mx-auto max-w-xl text-center">
            <span className="eyebrow justify-center text-brand-600">Features</span>
            <h2 className="font-display mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.9rem]">Everything you need, in one place</h2>
          </Reveal>
          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal
                key={f.title}
                delay={i * 80}
                className={`hover-lift group shadow-elegant rounded-2xl border border-slate-200 bg-white p-7 ${
                  i === 0 ? 'sm:col-span-2 lg:col-span-2' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${TONE_GRADIENT[f.tone]} text-white shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                    <Icon name={f.icon} className="h-5.5 w-5.5" />
                  </div>
                  {i === 0 && (
                    <span className="rounded-full border border-leaf-200 bg-leaf-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-leaf-700">
                      Core
                    </span>
                  )}
                </div>
                <h3 className={`mt-5 font-bold text-slate-900 ${i === 0 ? 'text-lg' : 'text-[15px]'}`}>{f.title}</h3>
                <p className={`mt-1.5 leading-relaxed text-slate-600 ${i === 0 ? 'max-w-md text-sm' : 'text-sm'}`}>{f.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <Reveal className="mx-auto max-w-xl text-center">
            <span className="eyebrow justify-center text-brand-600">How It Works</span>
            <h2 className="font-display mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.9rem]">Get started in four simple steps</h2>
          </Reveal>
          <div className="relative mt-16">
            <div className="absolute left-0 right-0 top-5 hidden h-px bg-gradient-to-r from-brand-200 via-brand-400 to-leaf-400 sm:block" />
            <div className="relative grid grid-cols-1 gap-8 sm:grid-cols-4">
              {STEPS.map((s, i) => (
                <Reveal key={s.n} delay={i * 100} className="group text-center sm:text-left">
                  <span className="font-display relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-brand-500 bg-white text-sm font-semibold text-brand-600 transition-transform duration-300 group-hover:scale-110 sm:mx-0 mx-auto">
                    {s.n}
                  </span>
                  <h3 className="mt-4 text-[15px] font-bold text-slate-900">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.desc}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section id="who" className="bg-slate-50 py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <Reveal className="mx-auto max-w-xl text-center">
            <span className="eyebrow justify-center text-brand-600">Who It's For</span>
            <h2 className="font-display mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.9rem]">Built for the whole aquaculture community</h2>
          </Reveal>
          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
            <Reveal className="hover-lift rounded-2xl bg-gradient-to-br from-leaf-500 to-leaf-700 p-8 text-white shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                <Icon name="fish" className="h-6 w-6" />
              </div>
              <h3 className="font-display mt-5 text-xl font-semibold">Fishpond Owners</h3>
              <p className="mt-2 text-sm leading-relaxed text-leaf-50">
                Register your fishpond, monitor production in real time, and get accurate harvest estimates for better planning.
              </p>
              <Link to="/register" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-white hover:underline">
                Register now <Icon name="arrowRight" className="h-4 w-4" />
              </Link>
            </Reveal>
            <Reveal delay={150} className="hover-lift rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-8 text-white shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                <Icon name="government" className="h-6 w-6" />
              </div>
              <h3 className="font-display mt-5 text-xl font-semibold">Agriculture Office Staff</h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-100">
                Get a consolidated overview of every fishpond in the municipality, approve registrations, and identify fishponds that need attention.
              </p>
              <Link to="/login" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-white hover:underline">
                Sign in as staff <Icon name="arrowRight" className="h-4 w-4" />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-slate-900 py-24">
        <div className="blob blob-b pointer-events-none -left-16 top-0 h-[24rem] w-[24rem] bg-leaf-400/10" />
        <Reveal className="relative mx-auto max-w-2xl px-5 text-center sm:px-8">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">Ready to modernize your fishpond?</h2>
          <p className="mt-3 text-brand-100">Registration is free. Your fishpond just needs approval from the Agriculture Office before you can start monitoring.</p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/register">
              <Button variant="accent" className="w-full px-6 py-3 text-[15px] sm:w-auto">Create an Account</Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" className="w-full border-white/30 bg-white/10 px-6 py-3 text-[15px] text-white hover:bg-white/20 sm:w-auto">Already Have an Account</Button>
            </Link>
          </div>
        </Reveal>
      </section>

      <ContactSection />

      {/* Footer */}
      <footer className="bg-slate-900 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 sm:flex-row sm:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600">
              <Icon name="freshwater" className="h-4 w-4 text-white" />
            </div>
            <span className="font-display text-base font-semibold text-white">AquaTrack</span>
          </div>
          <p className="text-center text-xs text-slate-400">
            Web-Based Aquaculture Monitoring and Harvest Estimation System &middot; Municipality of Noveleta, Cavite
          </p>
        </div>
      </footer>
    </div>
  );
}

// Office contact details, maintained by the admin in System Settings.
function ContactSection() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    settingsApi.getPublic().then(setSettings).catch(() => {});
  }, []);

  if (!settings) return null;

  const items = [
    { icon: 'mail', label: 'Email', value: settings.officeContactEmail, href: settings.officeContactEmail && `mailto:${settings.officeContactEmail}` },
    { icon: 'mobile', label: 'Phone', value: settings.officePhone, href: settings.officePhone && `tel:${settings.officePhone.replace(/[^\d+]/g, '')}` },
    { icon: 'location', label: 'Address', value: settings.officeAddress },
  ].filter((i) => i.value);

  return (
    <section id="contact" className="bg-white py-20">
      <Reveal className="mx-auto max-w-4xl px-5 text-center sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Contact Us</p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-slate-900">{settings.officeName}</h2>
        <p className="mt-2 text-slate-600">{settings.municipalityName}</p>
        {items.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {items.map((i) => (
              <div key={i.label} className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon name={i.icon} className="h-5 w-5" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{i.label}</span>
                {i.href ? (
                  <a href={i.href} className="break-all text-sm font-medium text-brand-700 hover:underline">{i.value}</a>
                ) : (
                  <span className="text-sm font-medium text-slate-800">{i.value}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-slate-500">Visit the office for questions about fishpond registration and monitoring.</p>
        )}
      </Reveal>
    </section>
  );
}
