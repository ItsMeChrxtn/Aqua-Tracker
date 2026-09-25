// Drop-in replacement for react-hot-toast: every notification is shown in the
// centered feedback modal instead of a corner toast.
import { showSuccess, showError, confirm } from '../components/feedback/feedbackStore';

const notify = {
  success: (message) => showSuccess(message),
  error: (message) => showError(message),
};

export { confirm };
export default notify;
