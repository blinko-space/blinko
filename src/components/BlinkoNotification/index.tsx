import { useEffect } from 'react';
import { Popover, PopoverTrigger, PopoverContent, Button, Badge } from "@nextui-org/react";
import { Icon } from '@iconify/react';
import { api } from '@/lib/trpc';
import dayjs from '@/lib/dayjs';
import { useTranslation } from 'react-i18next';
import { observer } from 'mobx-react-lite';
import { RootStore } from '@/store';
import { PromisePageState, PromiseState } from '@/store/standard/PromiseState';
import { ScrollArea } from '../Common/ScrollArea';
import { Notifications, NotificationType } from '@/lib/prismaZodType';
import { ShowCommentDialog } from '../BlinkoCard/commentButton';
import { BlinkoStore } from '@/store/blinkoStore';


export const BlinkoNotification = observer(() => {
  const { t } = useTranslation();
  const blinko = RootStore.Get(BlinkoStore)
  const store = RootStore.Local(() => ({
    isOpen: false,
    setIsOpen(open: boolean) {
      this.isOpen = open;
      if (open) {
        this.notificationList.resetAndCall({});
      }
    },
    notificationList: new PromisePageState({
      function: async ({ page, size }) => {
        return await api.notifications.list.query({ page, size });
      }
    }),
    unreadCount: new PromiseState({
      value: 0,
      function: async () => {
        return await api.notifications.unreadCount.query();
      },
    }),
    markAsRead: new PromiseState({
      function: async ({ id, all }: { id?: number; all?: boolean }) => {
        await api.notifications.markAsRead.mutate({ id, all });
        store.unreadCount.call();
        store.notificationList.resetAndCall({});
      }
    }),
    handleMarkAllAsRead() {
      this.markAsRead.call({ all: true });
    },
    handleMarkAsRead(notification: Notifications) {
      if (notification.type === NotificationType.COMMENT) {
        ShowCommentDialog(notification.metadata.noteId);
      }
      this.markAsRead.call({ id: notification.id });
    }
  }));

  useEffect(() => {
    store.unreadCount.call();
    store.notificationList.resetAndCall({});
  }, []);

  useEffect(() => {
    store.unreadCount.call();
    store.notificationList.resetAndCall({});
  }, [blinko.updateTicker]);

  if (store.unreadCount.value === 0 || blinko.config.value?.isHiddenNotification) {
    return null
  }

  return (
    <Popover
      placement="bottom-end"
      isOpen={store.isOpen}
      onOpenChange={store.setIsOpen}
    >
      <PopoverTrigger>
        <Button
          isIconOnly
          variant="light"
          size="sm"
        >
          <Badge
            content=""
            color="danger"
            isInvisible={!store.unreadCount.value}
            shape="circle"
          >
            <Icon icon="mi:notification" width="24" height="24" />
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0">
        <div className="flex items-center justify-between p-4  w-full">
          <div className="text-xl font-semibold">{t('notification')}</div>
          {/* @ts-ignore  */}
          {store?.unreadCount?.value > 0 && (
            <Button
              color="success"
              variant="light"
              size="sm"
              startContent={<Icon icon="material-symbols:check-circle-outline" />}
              onClick={() => store.handleMarkAllAsRead()}
            >
              {t('mark-all-as-read')}
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[600px] overflow-y-auto w-full" onBottom={() => {
          store.notificationList.callNextPage({});
        }}>
          {store.notificationList.isEmpty ? (
            <div className="text-center py-8 text-default-500">
              {t('no-notification')}
            </div>
          ) : (
            store.notificationList.value?.map((notification) => (
              <div
                key={notification.id}
                className="px-4 py-3 hover:bg-default-50 cursor-pointer bg-background"
                onClick={() => store.handleMarkAsRead(notification)}
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-default-100 p-2">
                    <Icon
                      icon={
                        notification.type === NotificationType.SYSTEM ? 'mdi:bell' :
                          notification.type === NotificationType.COMMENT ? 'mdi:comment' :
                            notification.type === NotificationType.FOLLOW ? 'mingcute:user-star-line' :
                              'mdi:account-plus'
                      }
                      className="text-xl text-default-600"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {!notification.isRead && (
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                      )}
                      <div className="font-medium text-sm line-clamp-1">
                        {t(notification.title || 'new-notification')}
                      </div>
                      <div className="text-xs text-default-400 ml-auto">
                        {dayjs(notification.createdAt).fromNow()}
                      </div>
                    </div>
                    <div className="text-sm text-default-500 line-clamp-2 mb-1">
                      {notification.content
                        .replace('followed-you', t('followed-you'))
                        .replace('backup-success', t('backup-success'))
                      }
                    </div>

                  </div>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
});