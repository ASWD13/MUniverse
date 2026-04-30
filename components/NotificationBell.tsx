"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const notifications = useQuery(api.announcements.getNotifications);
  const markRead = useMutation(api.announcements.markNotificationRead);

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  const handleMarkRead = async (id: Id<"notifications">) => {
    await markRead({ notificationId: id });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/5 text-zinc-300 transition hover:bg-white/10 active:bg-white/16"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white"></span>
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          ></div>
          <div className="absolute right-0 mt-2 z-50 w-80 rounded-xl border border-white/15 bg-zinc-950 p-2 shadow-2xl motion-enter">
            <header className="flex items-center justify-between border-b border-white/10 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Notifications
              </p>
              {unreadCount > 0 && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white">
                  {unreadCount} New
                </span>
              )}
            </header>
            <div className="max-h-96 overflow-y-auto">
              {notifications === undefined ? (
                <p className="p-4 text-center text-xs text-zinc-500">
                  Loading...
                </p>
              ) : notifications.length === 0 ? (
                <p className="p-4 text-center text-xs text-zinc-500">
                  No notifications yet.
                </p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {notifications.map((notification) => (
                    <li
                      key={notification._id}
                      className={`group relative rounded-lg p-3 transition ${
                        notification.isRead
                          ? "opacity-60 hover:bg-white/5"
                          : "bg-white/5 hover:bg-white/8"
                      }`}
                      onClick={() => !notification.isRead && handleMarkRead(notification._id)}
                    >
                      <p className="text-xs text-zinc-200">
                        {notification.content}
                      </p>
                      {!notification.isRead && (
                        <div className="absolute top-3 right-3 h-1.5 w-1.5 rounded-full bg-white"></div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
