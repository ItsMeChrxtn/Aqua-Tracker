import { Link } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import Button from '../components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white text-center">
      <Icon name="fish" className="h-10 w-10 text-slate-400" />
      <p className="text-xl font-semibold text-slate-700">Page not found</p>
      <p className="text-sm text-slate-400">The page you're looking for doesn't exist.</p>
      <Link to="/">
        <Button size="sm" icon="arrowRight">Back to AquaTrack</Button>
      </Link>
    </div>
  );
}
