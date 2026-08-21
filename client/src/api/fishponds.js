import client from './client';

export const fishpondApi = {
  list: (params) => client.get('/fishponds', { params }).then((r) => r.data.fishponds),
  get: (id) => client.get(`/fishponds/${id}`).then((r) => r.data.fishpond),
  register: (formData) =>
    client
      .post('/fishponds', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data.fishpond),
  update: (id, formData) =>
    client
      .put(`/fishponds/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data.fishpond),
  remove: (id) => client.delete(`/fishponds/${id}`).then((r) => r.data),
  approve: (id) => client.patch(`/fishponds/${id}/approve`).then((r) => r.data.fishpond),
  reject: (id, reason) => client.patch(`/fishponds/${id}/reject`, { reason }).then((r) => r.data.fishpond),
};

export const cycleApi = {
  listForFishpond: (fishpondId, params) =>
    client.get(`/fishponds/${fishpondId}/cycles`, { params }).then((r) => r.data.cycles),
  create: (fishpondId, data) => client.post(`/fishponds/${fishpondId}/cycles`, data).then((r) => r.data.cycle),
  get: (id) => client.get(`/cycles/${id}`).then((r) => r.data),
  update: (id, data) => client.put(`/cycles/${id}`, data).then((r) => r.data.cycle),
};

function recordApi(segment) {
  return {
    listForCycle: (cycleId, params) =>
      client.get(`/cycles/${cycleId}/${segment}`, { params }).then((r) => r.data.records),
    listForFishpond: (fishpondId, params) =>
      client.get(`/fishponds/${fishpondId}/${segment}-records`, { params }).then((r) => r.data),
    create: (cycleId, data) => client.post(`/cycles/${cycleId}/${segment}`, data).then((r) => r.data.record),
    remove: (id) => client.delete(`/${segment}/${id}`).then((r) => r.data),
  };
}

export const stockingApi = recordApi('stocking');
export const growthApi = recordApi('growth');
export const mortalityApi = recordApi('mortality');
export const feedingApi = recordApi('feeding');
export const salesApi = recordApi('sales');

export const harvestApi = {
  getEstimate: (cycleId) => client.get(`/cycles/${cycleId}/harvest-estimate`).then((r) => r.data.estimate),
  logHarvest: (cycleId, data) => client.post(`/cycles/${cycleId}/harvest`, data).then((r) => r.data),
  history: (fishpondId, params) => client.get(`/fishponds/${fishpondId}/harvest-history`, { params }).then((r) => r.data.logs),
};
