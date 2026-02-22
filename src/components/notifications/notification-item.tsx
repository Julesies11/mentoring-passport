import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { 
  FileCheck, 
  MessageSquare, 
  Calendar, 
  Link2, 
  CheckCircle,
  X,
} from 'lucide-react';
import { Notification } from '@/lib/api/notifications';
import { cn } from '@/lib/utils';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const notificationIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  evidence_uploaded: FileCheck,
  evidence_approved: CheckCircle,
  evidence_rejected: FileCheck,
  note_added: MessageSquare,
  meeting_created: Calendar,
  meeting_updated: Calendar,
  pair_created: Link2,
  pair_archived: Link2,
  task_completed: CheckCircle,
};

const notificationColors: Record<string, string> = {
  evidence_uploaded: 'text-blue-600',
  evidence_approved: 'text-green-600',
  evidence_rejected: 'text-red-600',
  note_added: 'text-purple-600',
  meeting_created: 'text-indigo-600',
  meeting_updated: 'text-indigo-600',
  pair_created: 'text-teal-600',
  pair_archived: 'text-gray-600',
  task_completed: 'text-green-600',
};

export function NotificationItem({ 
  notification, 
  onMarkAsRead, 
  onDelete 
}: NotificationItemProps) {
  const Icon = notificationIcons[notification.type] || FileCheck;
  const iconColor = notificationColors[notification.type] || 'text-gray-600';
  
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { 
    addSuffix: true 
  });

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(notification.id);
  };

  const content = (
    <div
      className={cn(
        'flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors relative group',
        !notification.is_read && 'bg-primary/5'
      )}
      onClick={handleClick}
    >
      <div className={cn('flex-shrink-0 mt-0.5', iconColor)}>
        <Icon className="w-5 h-5" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            'text-sm font-medium',
            !notification.is_read && 'font-semibold'
          )}>
            {notification.title}
          </p>
          {!notification.is_read && (
            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
          )}
        </div>
        
        {notification.description && (
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
            {notification.description}
          </p>
        )}
        
        <p className="text-xs text-muted-foreground mt-1">
          {timeAgo}
        </p>
      </div>

      <button
        onClick={handleDelete}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
        aria-label="Delete notification"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );

  if (notification.action_url) {
    return (
      <Link to={notification.action_url} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
