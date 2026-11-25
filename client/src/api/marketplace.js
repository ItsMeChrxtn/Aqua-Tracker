import client from './client';

const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };

// Owner: own products (FormData because of the optional photo).
export const productApi = {
  list: () => client.get('/products').then((r) => r.data.products),
  create: (formData) => client.post('/products', formData, multipart).then((r) => r.data.product),
  update: (id, formData) => client.put(`/products/${id}`, formData, multipart).then((r) => r.data.product),
  remove: (id) => client.delete(`/products/${id}`).then((r) => r.data),
};

// Buyer: what is for sale.
export const marketplaceApi = {
  list: (params) => client.get('/marketplace/products', { params }).then((r) => r.data.products),
  get: (id) => client.get(`/marketplace/products/${id}`).then((r) => r.data.product),
};

export const orderApi = {
  list: (params) => client.get('/orders', { params }).then((r) => r.data.orders),
  get: (id) => client.get(`/orders/${id}`).then((r) => r.data.order),
  create: (data) => client.post('/orders', data).then((r) => r.data.order),
  accept: (id) => client.patch(`/orders/${id}/accept`).then((r) => r.data.order),
  decline: (id, reason) => client.patch(`/orders/${id}/decline`, { reason }).then((r) => r.data.order),
  complete: (id) => client.patch(`/orders/${id}/complete`).then((r) => r.data.order),
  cancel: (id, reason) => client.patch(`/orders/${id}/cancel`, { reason }).then((r) => r.data.order),
};
