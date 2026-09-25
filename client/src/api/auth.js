import client from './client';

export const authApi = {
  register: (data) => client.post('/auth/register', data).then((r) => r.data),
  verifyEmail: (data) => client.post('/auth/verify-email', data).then((r) => r.data),
  resendOtp: (email) => client.post('/auth/resend-otp', { email }, { loadingText: 'Sending a new code…' }).then((r) => r.data),
  login: (data) => client.post('/auth/login', data).then((r) => r.data),
  me: () => client.get('/auth/me').then((r) => r.data),
  updateProfile: (data) => client.put('/auth/me', data).then((r) => r.data),
  changePassword: (data) => client.put('/auth/change-password', data).then((r) => r.data),
};
