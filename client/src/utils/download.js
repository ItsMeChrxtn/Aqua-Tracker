import client, { apiErrorMessage } from '../api/client';
import { startLoading, finishLoading } from '../components/feedback/feedbackStore';

// Downloads use JWT bearer auth (not cookies), so a plain <a href> won't carry
// the Authorization header — fetch as a blob instead and trigger the save.
export async function downloadFile(url, fallbackFilename) {
  startLoading('Preparing your file…');
  let res;
  try {
    res = await client.get(url, { responseType: 'blob' });
    finishLoading({ type: 'success', message: 'Download started.' });
  } catch (err) {
    finishLoading({ type: 'error', message: apiErrorMessage(err, 'Export failed') });
    throw err;
  }
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
