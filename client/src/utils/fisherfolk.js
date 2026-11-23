// Choices and labels for the BFAR Municipal Fisherfolk Registration form.
export const REGISTRATION_TYPES = [
  { value: 'new', label: 'New Registration' },
  { value: 'renewal', label: 'Renewal' },
  { value: 'transferee', label: 'Transferee' },
];

export const SALUTATIONS = ['Mr', 'Ms', 'Mrs'];

export const EMPLOYMENT = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
];

export const SEX = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

export const CIVIL_STATUS = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'legally_separated', label: 'Legally Separated' },
  { value: 'widowed', label: 'Widowed' },
];

export const EDUCATION = [
  { value: 'elementary', label: 'Elementary' },
  { value: 'high_school', label: 'High School' },
  { value: 'vocational', label: 'Vocational' },
  { value: 'college', label: 'College' },
  { value: 'post_graduate', label: 'Post-Graduate' },
  { value: 'others', label: 'Others' },
];

export const RELIGIONS = ['Roman Catholic', 'Protestant Christian', 'Iglesia Ni Cristo', 'Aglipayan', 'Islam', 'No Religion'];

export const MONTHLY_INCOME = [
  { value: 'below_5000', label: 'Less than ₱5,000' },
  { value: '5001_10000', label: '₱5,001 – ₱10,000' },
  { value: '10001_20000', label: '₱10,001 – ₱20,000' },
  { value: '20001_30000', label: '₱20,001 – ₱30,000' },
  { value: '30001_40000', label: '₱30,001 – ₱40,000' },
  { value: 'above_40000', label: 'More than ₱40,000' },
];

export const INCOME_SOURCES = [
  { value: 'capture_fishing', label: 'Capture Fishing', detail: 'Gear used' },
  { value: 'aquaculture', label: 'Aquaculture', detail: 'Gear used / type of culture' },
  { value: 'fish_vending', label: 'Fish Vending' },
  { value: 'gleaning', label: 'Gleaning' },
  { value: 'fish_processing', label: 'Fish Processing' },
  { value: 'others', label: 'Others', detail: 'Please specify' },
];

export const APPLICATION_STATUS = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-700 border-slate-300' },
  pending: { label: 'Under Review', className: 'bg-amber-50 text-amber-700 border-amber-300' },
  approved: { label: 'Approved', className: 'bg-leaf-50 text-leaf-700 border-leaf-300' },
  rejected: { label: 'Returned for Correction', className: 'bg-rose-50 text-rose-700 border-rose-300' },
};

export const labelOf = (list, value) => list.find((o) => o.value === value)?.label || '';

export function fullName(app) {
  if (!app) return '';
  return [app.salutation && `${app.salutation}.`, app.firstName, app.middleName, app.lastName, app.appellation].filter(Boolean).join(' ');
}

export function ageFrom(birthDate) {
  if (!birthDate) return '';
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return '';
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now < new Date(now.getFullYear(), b.getMonth(), b.getDate())) age -= 1;
  return age >= 0 ? age : '';
}
