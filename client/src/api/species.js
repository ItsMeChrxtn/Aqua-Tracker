import client from './client';

export const speciesApi = {
  list: (params) => client.get('/species', { params }).then((r) => r.data.species),
  get: (id) => client.get(`/species/${id}`).then((r) => r.data.species),
  create: (data) => client.post('/species', data).then((r) => r.data.species),
  update: (id, data) => client.put(`/species/${id}`, data).then((r) => r.data.species),
  remove: (id) => client.delete(`/species/${id}`).then((r) => r.data),
};
