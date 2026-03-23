import { ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useNotifications } from '@/hooks/use-notifications';
import { NotificationItem } from '@/components/notifications/notification-item';
import { KeenIcon } from '@/components/keenicons';

export function NotificationsSheet({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    isLoading,
    isFetching,
    limit,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
  } = useNotifications();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="p-0 gap-0 sm:w-[500px] sm:max-w-none start-auto h-auto rounded-lg [&_[data-slot=sheet-close]]:top-4 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="border-b border-border py-4 px-6">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-bold">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {unreadCount} New
                </span>
              )}
            </SheetTitle>
          </div>
        </SheetHeader>
        
        <SheetBody className="grow p-0">
          <ScrollArea className="h-[calc(100vh-14rem)]">
            <div className="p-4">
              {isLoading && notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <KeenIcon icon="loading" className="text-3xl text-gray-400 animate-spin mb-4" />
                  <p className="text-gray-500 font-medium">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="size-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <KeenIcon icon="notification-on" className="text-2xl text-gray-400" />
                  </div>
                  <p className="text-gray-800 font-bold text-lg">No notifications yet</p>
                  <p className="text-gray-500 text-sm mt-1">
                    When you receive updates, they'll appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onDelete={deleteNotification}
                      onClose={() => setOpen(false)}
                    />
                  ))}
                  
                  {notifications.length >= limit && (
                    <div className="pt-4 text-center">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={loadMore} 
                        disabled={isFetching}
                        className="text-xs font-bold text-primary hover:bg-primary/5 transition-all"
                      >
                        {isFetching ? (
                          <>
                            <KeenIcon icon="loading" className="animate-spin mr-2" />
                            Loading...
                          </>
                        ) : (
                          'Load More'
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetBody>

        <SheetFooter className="border-t border-border p-5 flex items-center justify-between gap-3 bg-muted/5">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => markAllAsRead()}
            disabled={unreadCount === 0}
            className="flex-1 font-bold text-xs"
          >
            <KeenIcon icon="check-double" className="text-xs mr-1.5" />
            Mark all as read
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={notifications.length === 0}
            className="flex-1 font-bold text-xs"
            onClick={() => clearAllNotifications()}
          >
            <KeenIcon icon="trash" className="text-xs mr-1.5" />
            Clear all
          </Button>        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
