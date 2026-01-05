import { useNavigate } from 'react-router-dom';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

export function useGlobalShortcuts() {
  const navigate = useNavigate();

  useKeyboardShortcuts({
    sequenceShortcuts: [
      {
        sequence: ['g', 'p'],
        handler: () => navigate('/projects'),
      },
      {
        sequence: ['g', 'w'],
        handler: () => navigate('/workflow'),
      },
      {
        sequence: ['g', 'u'],
        handler: () => navigate('/users'),
      },
      {
        sequence: ['g', 'g'],
        handler: () => navigate('/groups'),
      },
      {
        sequence: ['g', 'r'],
        handler: () => navigate('/permissions'),
      },
    ],
  });
}
