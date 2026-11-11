// Drop-in replacement for react-hot-toast: every notification is shown in the
// centered feedback modal instead of a corner toast.
import { showSuccess, showError, showInfo, dismiss, confirm } from '../components/feedback/feedbackStore';

const notify = {
  success: (message) => showSuccess(message),
  error: (message, options) => showError(message, options),
  dismiss: () => dismiss(),
  info: (title, html) => showInfo(title, html),
};

export { confirm };
export default notify;
