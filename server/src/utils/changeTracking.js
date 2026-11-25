// Audit trail of edits: remembers each document's values when it is loaded
// and, when it is saved again, lists which fields changed from what to what.
// The list is left on `doc.$locals.changes` for logActivity({ doc }) to store.
// Must be required before any model is compiled (top of app.js).
const mongoose = require('mongoose');

const SKIP = /^(passwordHash|otp|__v$|updatedAt$|createdAt$|\$)/;
const MAX_LEN = 200;

function show(value) {
  if (value === undefined || value === null || value === '') return '—';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (value instanceof mongoose.Types.ObjectId) return String(value);
  if (value && value._id && typeof value === 'object') return String(value._id);
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return text.length > MAX_LEN ? `${text.slice(0, MAX_LEN)}…` : text;
}

const isPlainObject = (v) =>
  v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && !(v instanceof mongoose.Types.ObjectId) && !Buffer.isBuffer(v);

mongoose.plugin((schema) => {
  schema.post('init', function rememberOriginal() {
    this.$locals.original = this.toObject({ depopulate: true });
  });

  schema.pre('save', function listChanges() {
    if (this.isNew || !this.$locals.original) return;
    const paths = this.modifiedPaths();
    // Keep the most specific paths only ("emergency.name", not "emergency").
    const leaves = paths.filter((p) => !SKIP.test(p) && !paths.some((other) => other.startsWith(`${p}.`)));
    const original = this.$locals.original;
    const current = this.toObject({ depopulate: true });
    const at = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
    const changes = [];
    const compare = (path, before, after) => {
      // A whole sub-object replaced (e.g. location = { lat, lng }): list its fields.
      if (isPlainObject(before) || isPlainObject(after)) {
        const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
        keys.forEach((k) => k !== '_id' && compare(`${path}.${k}`, before?.[k], after?.[k]));
        return;
      }
      const from = show(before);
      const to = show(after);
      if (from !== to) changes.push({ field: path, from, to });
    };
    leaves.forEach((path) => compare(path, at(original, path), at(current, path)));
    this.$locals.changes = changes;
  });

  // Saved documents become the new baseline for the next edit.
  schema.post('save', function resetOriginal() {
    this.$locals.original = this.toObject({ depopulate: true });
  });
});

module.exports = {};
