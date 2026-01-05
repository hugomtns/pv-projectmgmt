import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface NotFoundProps {
  message?: string;
}

export default function NotFound({ message = 'Page not found' }: NotFoundProps) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-lg text-muted-foreground">{message}</p>
        <Button asChild>
          <Link to="/projects">Return to Projects</Link>
        </Button>
      </div>
    </div>
  );
}
