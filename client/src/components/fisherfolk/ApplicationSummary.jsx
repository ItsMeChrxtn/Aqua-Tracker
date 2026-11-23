import { assetUrl } from '../../api/client';
import Icon from '../ui/Icon';
import FishpondPhoto from '../ui/FishpondPhoto';
import { formatDate } from '../../utils/format';
import {
  REGISTRATION_TYPES,
  EMPLOYMENT,
  SEX,
  CIVIL_STATUS,
  EDUCATION,
  MONTHLY_INCOME,
  INCOME_SOURCES,
  labelOf,
  fullName,
  ageFrom,
} from '../../utils/fisherfolk';

const isImage = (url) => /\.(png|jpe?g|webp|gif)$/i.test(url || '');
const yesNo = (v) => (v === true ? 'Yes' : v === false ? 'No' : '');
const show = (v) => (v === undefined || v === null || v === '' ? '—' : v);

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-sm">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{show(children)}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-200">
      <p className="rounded-t-xl bg-brand-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-brand-700">{title}</p>
      <div className="grid gap-x-6 divide-slate-100 px-3 py-1 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function sourceList(list) {
  if (!list?.length) return '—';
  return list.map((s) => `${labelOf(INCOME_SOURCES, s.type)}${s.details ? ` (${s.details})` : ''}`).join(', ');
}

// Read-only view of everything on a fisherfolk application.
export default function ApplicationSummary({ application: a }) {
  const hh = a.household || {};
  const em = a.emergency || {};
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[150px_1fr]">
        <FishpondPhoto src={a.photoUrl} alt="Applicant photo" fit="cover" className="h-[150px] w-[150px] rounded-xl" />
        <div className="divide-y divide-slate-100">
          <Row label="Name">{fullName(a)}</Row>
          <Row label="Type">{labelOf(REGISTRATION_TYPES, a.registrationType)}</Row>
          <Row label="Registration No.">{a.registrationNo}</Row>
          <Row label="Registration Date">{a.registrationDate ? formatDate(a.registrationDate) : ''}</Row>
          <Row label="Submitted">{a.submittedAt ? formatDate(a.submittedAt) : ''}</Row>
        </div>
      </div>

      <Section title="Personal Information">
        <Row label="Address">{[a.address?.street, a.address?.barangay, a.address?.municipality, a.address?.province].filter(Boolean).join(', ')}</Row>
        <Row label="Contact No.">{a.contactNo}</Row>
        <Row label="Fishing Ground">{a.fishingGround}</Row>
        <Row label="FMA Number">{a.fmaNumber}</Row>
        <Row label="Full / Part Time">{labelOf(EMPLOYMENT, a.employment)}</Row>
        <Row label="Resident since">{a.residentSince}</Row>
        <Row label="Date of Birth">{a.birthDate ? `${formatDate(a.birthDate)} (${ageFrom(a.birthDate)} yrs)` : ''}</Row>
        <Row label="Place of Birth">{a.placeOfBirth}</Row>
        <Row label="Sex">{labelOf(SEX, a.sex)}</Row>
        <Row label="Civil Status">{labelOf(CIVIL_STATUS, a.civilStatus)}</Row>
        <Row label="No. of Children">{a.childrenCount}</Row>
        <Row label="Nationality">{a.nationality}</Row>
        <Row label="Religion">{a.religion}</Row>
        <Row label="Education">{a.education === 'others' ? a.educationOther : labelOf(EDUCATION, a.education)}</Row>
      </Section>

      <Section title="Household">
        <Row label="Total households">{hh.total}</Row>
        <Row label="Male / Female">{hh.male !== undefined || hh.female !== undefined ? `${show(hh.male)} / ${show(hh.female)}` : ''}</Row>
        <Row label="In-school / Out-of-school">{hh.inSchool !== undefined || hh.outOfSchool !== undefined ? `${show(hh.inSchool)} / ${show(hh.outOfSchool)}` : ''}</Row>
        <Row label="Employed / Unemployed">{hh.employed !== undefined || hh.unemployed !== undefined ? `${show(hh.employed)} / ${show(hh.unemployed)}` : ''}</Row>
        <Row label="Monthly income">{labelOf(MONTHLY_INCOME, a.monthlyIncome)}</Row>
        <Row label="Other income">
          {a.otherIncomeSource ? `${a.otherIncomeSource}${a.otherIncomeValue ? ` — ₱${Number(a.otherIncomeValue).toLocaleString('en-PH')}` : ''}` : ''}
        </Row>
      </Section>

      <Section title="Emergency Contact & IDs">
        <Row label="Contact person">{em.name}</Row>
        <Row label="Relationship">{em.relationship}</Row>
        <Row label="Contact No.">{em.contactNo}</Row>
        <Row label="Address">{em.address}</Row>
        <Row label="Voter's ID">{a.hasVoterId ? `Yes${a.voterIdNo ? ` — ${a.voterIdNo}` : ''}` : yesNo(a.hasVoterId)}</Row>
        <Row label="CCT / 4Ps">{yesNo(a.cct4ps)}</Row>
        <Row label="Indigenous (IP)">{yesNo(a.indigenous)}</Row>
      </Section>

      <Section title="Livelihood & Organization">
        <Row label="Main source">{sourceList(a.mainSources)}</Row>
        <Row label="Other sources">{sourceList(a.otherSources)}</Row>
        <Row label="Organizations">
          {a.organizations?.length
            ? a.organizations.map((o) => [o.name, o.position, o.memberSince && `since ${o.memberSince}`].filter(Boolean).join(', ')).join('; ')
            : ''}
        </Row>
      </Section>

      <div className="rounded-xl border border-slate-200 p-3">
        <p className="mb-2 text-xs font-semibold text-slate-700">Barangay Certification (fishpond ownership)</p>
        {!a.barangayCertUrl ? (
          <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-xs text-slate-400">Not submitted</p>
        ) : (
          <a href={assetUrl(a.barangayCertUrl)} target="_blank" rel="noreferrer" className="group block" title="Open in a new tab">
            {isImage(a.barangayCertUrl) ? (
              <img src={assetUrl(a.barangayCertUrl)} alt="Barangay Certification" className="h-56 w-full rounded-lg bg-slate-100 object-contain transition group-hover:opacity-80" />
            ) : (
              <div className="flex h-24 items-center justify-center gap-2 rounded-lg bg-slate-50 text-slate-500 group-hover:bg-brand-50 group-hover:text-brand-700">
                <Icon name="clipboard" className="h-6 w-6" />
                <span className="break-all text-xs">{a.barangayCertName || 'Open document'}</span>
              </div>
            )}
            <span className="mt-1.5 block text-center text-[11px] font-medium text-brand-600 group-hover:underline">Open ↗</span>
          </a>
        )}
      </div>
    </div>
  );
}
