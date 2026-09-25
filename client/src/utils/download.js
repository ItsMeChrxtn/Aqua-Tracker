import client from '../api/client';

// Downloads use JWT bearer auth (not cookies), so a plain <a href> won't carry
// the Authorization header — fetch as a blob instead and trigger the save.
export async function downloadFile(url, fallbackFilename) {
  const res = await client.get(url, { responseType: 'blob' });
  const disposition = res.headers['content-disposition'] || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : fallbackFilename;

  const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}
