import client from './client';

const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };

export const fisherfolkApi = {
  mine: () => client.get('/fisherfolk/me').then((r) => r.data.application),
  // `data` is the form as an object; files are the photo and Barangay Certification.
  saveMine: (data, { photo, barangayCert, submit } = {}) => {
    const form = new FormData();
    form.append('data', JSON.stringify(data));
    if (photo) form.append('photo', photo);
    if (barangayCert) form.append('barangayCert', barangayCert);
    if (submit) form.append('submit', 'true');
    return client
      .put('/fisherfolk/me', form, { ...multipart, loadingText: submit ? 'Submitting application…' : 'Saving draft…' })
      .then((r) => r.data.application);
  },
  list: (params) => client.get('/fisherfolk', { params }).then((r) => r.data.applications),
  get: (id) => client.get(`/fisherfolk/${id}`).then((r) => r.data.application),
  approve: (id, data) => client.patch(`/fisherfolk/${id}/approve`, data).then((r) => r.data.application),
  reject: (id, reason) => client.patch(`/fisherfolk/${id}/reject`, { reason }, { loadingText: 'Returning application…' }).then((r) => r.data.application),
  myPdfUrl: () => '/fisherfolk/me/pdf',
  pdfUrl: (id) => `/fisherfolk/${id}/pdf`,
};
