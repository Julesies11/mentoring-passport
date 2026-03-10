import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';

export function SupabaseStatus() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    async function checkStatus() {
      try {
        const { error } = await supabase.from('mp_profiles').select('id').limit(1);
        if (error) throw error;
        setStatus('online');
      } catch (err) {
        console.error('Supabase status check failed:', err);
        setStatus('offline');
      }
    }

    checkStatus();
    
    // Check every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (status === 'checking') return null;

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant="outline" 
        className={status === 'online' ? 'bg-success-light text-success border-none' : 'bg-danger-light text-danger border-none'}
      >
        <span className={`size-1.5 rounded-full mr-1.5 ${status === 'online' ? 'bg-success' : 'bg-danger'} animate-pulse`} />
        {status === 'online' ? 'Database Online' : 'Database Offline'}
      </Badge>
    </div>
  );
}
