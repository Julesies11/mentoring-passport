import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function ChecklistPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/program-member/tasks', { replace: true });
  }, [navigate]);

  return null;
}
