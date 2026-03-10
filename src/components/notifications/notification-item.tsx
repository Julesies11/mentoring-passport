import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { Notification } from '@/lib/api/notifications';
import { cn } from '@/lib/utils';
import { KeenIcon } from '@/components/keenicons';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClose?: () => void;
}

const notificationIcons: Record<string, string> = {
  evidence_uploaded: 'file-up',
  evidence_approved: 'check-circle',
  evidence_rejected: 'cross-circle',
  note_added: 'message-text-2',
  meeting_created: 'calendar',
  meeting_updated: 'calendar',
  pair_created: 'people',
  pair_archived: 'archive',
  task_completed: 'verify',
  stagnation_alert: 'time',
  milestone_50: 'award',
  pair_completed: 'medal-star',
  profile_completed: 'user-tick',
};

const notificationColors: Record<string, string> = {
  evidence_uploaded: 'text-blue-600 bg-blue-50',
  evidence_approved: 'text-green-600 bg-green-50',
  evidence_rejected: 'text-red-600 bg-red-50',
  note_added: 'text-purple-600 bg-purple-50',
  meeting_created: 'text-indigo-600 bg-indigo-50',
  meeting_updated: 'text-indigo-600 bg-indigo-50',
  pair_created: 'text-teal-600 bg-teal-50',
  pair_archived: 'text-gray-600 bg-gray-50',
  task_completed: 'text-emerald-600 bg-emerald-50',
  stagnation_alert: 'text-orange-600 bg-orange-50',
  milestone_50: 'text-indigo-600 bg-indigo-50',
  pair_completed: 'text-yellow-600 bg-yellow-50',
  profile_completed: 'text-blue-600 bg-blue-50',
};

export function NotificationItem({ 
  notification, 
  onMarkAsRead, 
  onDelete,
  onClose
}: NotificationItemProps) {
  const iconName = notificationIcons[notification.type] || 'notification-on';
  const colorClass = notificationColors[notification.type] || 'text-gray-600 bg-gray-50';
  
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { 
    addSuffix: true 
  });

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    if (onClose) {
      onClose();
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
        'flex gap-3.5 p-4 rounded-xl transition-all relative group cursor-pointer border border-transparent',
        notification.is_read 
          ? 'hover:bg-gray-50 hover:border-gray-100' 
          : 'bg-primary/[0.03] border-primary/5 hover:bg-primary/[0.05] hover:border-primary/10'
      )}
    >
      <div className={cn(
        'flex-shrink-0 size-10 rounded-lg flex items-center justify-center',
        colorClass
      )}>
        <KeenIcon icon={iconName} className="text-xl" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            'text-sm leading-tight mb-1',
            notification.is_read ? 'text-gray-800 font-medium' : 'text-gray-900 font-bold'
          )}>
            {notification.title}
          </p>
          {!notification.is_read && (
            <div className="size-2 bg-primary rounded-full flex-shrink-0 mt-1 shadow-[0_0_0_2px_rgba(var(--primary-rgb),0.2)]" />
          )}
        </div>
        
        {notification.description && (
          <p className={cn(
            'text-[13px] leading-normal line-clamp-2',
            notification.is_read ? 'text-gray-500' : 'text-gray-600'
          )}>
            {notification.description}
          </p>
        )}
        
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
            {timeAgo}
          </span>
          {notification.is_read && (
            <span className="size-1 rounded-full bg-gray-300" />
          )}
          {notification.is_read && (
            <span className="text-[11px] font-medium text-gray-400">Read</span>
          )}
        </div>
      </div>

      <button
        onClick={handleDelete}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all size-7 flex items-center justify-center hover:bg-white hover:shadow-sm rounded-md border border-transparent hover:border-gray-200"
        aria-label="Delete notification"
      >
        <KeenIcon icon="trash" className="text-sm text-gray-400 hover:text-red-500" />
      </button>
    </div>
  );

  if (notification.action_url) {
    return (
      <Link 
        to={notification.action_url} 
        className="block no-underline"
        onClick={handleClick}
      >
        {content}
      </Link>
    );
  }

  return (
    <div onClick={handleClick}>
      {content}
    </div>
  );
}
