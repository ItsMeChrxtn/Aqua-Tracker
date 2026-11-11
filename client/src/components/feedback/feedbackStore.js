// All notifications (loading / success / error / confirm) are SweetAlert2
// modals centered on screen. The axios client and plain functions drive them
// through the helpers below.
import Swal from 'sweetalert2';
import { fishLoaderHtml } from './fishLoader';

const SUCCESS_AUTO_CLOSE_MS = 1800;
// After a request settles, give the page a moment to call notify.success /
// notify.error with its own message before falling back to a generic one.
const FALLBACK_DELAY_MS = 700;

const BRAND = '#1c6e6e';
const DANGER = '#e11d48';

const base = Swal.mixin({
  customClass: { popup: 'aq-swal' },
  confirmButtonColor: BRAND,
  cancelButtonColor: '#94a3b8',
});

let loading = false;
let pending = 0;
let fallbackTimer = null;

function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function startLoading(message) {
  clearTimeout(fallbackTimer);
  pending += 1;
  loading = true;
  base.fire({
    html: `${fishLoaderHtml}<p class="aq-swal__title">${escapeHtml(message)}</p><p class="aq-swal__sub">Please wait a moment…</p>`,
    showConfirmButton: false,
    allowOutsideClick: false,
    allowEscapeKey: false,
  });
}

// Called by the axios client when a tracked request finishes. `fallback` is
// the message shown if the page doesn't report its own result in time.
export function finishLoading(fallback) {
  pending = Math.max(0, pending - 1);
  if (pending > 0) return;
  clearTimeout(fallbackTimer);
  fallbackTimer = setTimeout(() => {
    if (!loading) return;
    if (fallback.type === 'error') showError(fallback.message);
    else showSuccess(fallback.message);
  }, FALLBACK_DELAY_MS);
}

export function showSuccess(message) {
  clearTimeout(fallbackTimer);
  loading = false;
  base.fire({ icon: 'success', title: 'Success!', text: message, timer: SUCCESS_AUTO_CLOSE_MS, timerProgressBar: true });
}

export function showError(message, { title = 'Oops…', confirmText = 'OK' } = {}) {
  clearTimeout(fallbackTimer);
  loading = false;
  base.fire({ icon: 'error', title, text: message, confirmButtonText: confirmText, confirmButtonColor: DANGER });
}

// Closes the loading modal without showing any result.
export function dismiss() {
  clearTimeout(fallbackTimer);
  loading = false;
  Swal.close();
}

// Informational alert that stays open until dismissed.
export function showInfo(title, html) {
  clearTimeout(fallbackTimer);
  loading = false;
  return base.fire({ icon: 'info', title, html });
}

// Promise-based replacement for window.confirm.
export async function confirm(message, { title = 'Are you sure?', confirmLabel = 'Yes, delete it', danger = true } = {}) {
  clearTimeout(fallbackTimer);
  loading = false;
  const result = await base.fire({
    icon: 'warning',
    title,
    text: message,
    showCancelButton: true,
    confirmButtonText: confirmLabel,
    cancelButtonText: 'Cancel',
    confirmButtonColor: danger ? DANGER : BRAND,
    reverseButtons: true,
    focusCancel: true,
  });
  return result.isConfirmed;
}
