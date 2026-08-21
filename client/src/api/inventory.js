import client from './client';

export const inventoryApi = {
  listForFishpond: (fishpondId) => client.get(`/fishponds/${fishpondId}/inventory`).then((r) => r.data.items),
  create: (fishpondId, data) => client.post(`/fishponds/${fishpondId}/inventory`, data).then((r) => r.data.item),
  update: (id, data) => client.put(`/inventory/${id}`, data).then((r) => r.data.item),
  adjust: (id, type, quantity) => client.patch(`/inventory/${id}/adjust`, { type, quantity }).then((r) => r.data.item),
  remove: (id) => client.delete(`/inventory/${id}`).then((r) => r.data),
};
