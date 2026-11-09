import client from './client';

export const userApi = {
  list: (params) => client.get('/users', { params }).then((r) => r.data.users),
  get: (id) => client.get(`/users/${id}`).then((r) => r.data.user),
  create: (data) => client.post('/users', data).then((r) => r.data),
  update: (id, data) => client.put(`/users/${id}`, data).then((r) => r.data.user),
  remove: (id) => client.delete(`/users/${id}`).then((r) => r.data),
  resetPassword: (id) => client.put(`/users/${id}/reset-password`, {}, { loadingText: 'Resetting password…' }).then((r) => r.data),
};

export const reportApi = {
  ownerSummary: () => client.get('/reports/owner-summary').then((r) => r.data),
  municipalSummary: (params) => client.get('/reports/municipal-summary', { params }).then((r) => r.data),
  adminSummary: () => client.get('/reports/admin-summary').then((r) => r.data),
  exportExcelUrl: () => '/reports/export/excel',
  exportPdfUrl: () => '/reports/export/pdf',
};

export const notificationApi = {
  list: (params) => client.get('/notifications', { params }).then((r) => r.data),
  markRead: (id) => client.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => client.patch('/notifications/read-all').then((r) => r.data),
};

export const activityLogApi = {
  list: (params) => client.get('/activity-logs', { params }).then((r) => r.data),
};

export const settingsApi = {
  get: () => client.get('/settings').then((r) => r.data.settings),
  update: (data) => client.put('/settings', data).then((r) => r.data.settings),
};

export const adminApi = {
  backupUrl: () => '/admin/backup',
};
