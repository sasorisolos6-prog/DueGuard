import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Tracker } from '../types';
import { formatInr } from './utils';

function hashIdToInt(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 2_000_000_000;
}

export function isNativeAndroid(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function syncLocalDeviceNotifications(trackers: Tracker[]): Promise<{
  supported: boolean;
  scheduledCount: number;
}> {
  if (!Capacitor.isNativePlatform()) {
    return { supported: false, scheduledCount: 0 };
  }

  const perms = await LocalNotifications.requestPermissions();
  if (perms.display !== 'granted') {
    return { supported: true, scheduledCount: 0 };
  }

  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel({ notifications: pending.notifications });
  }

  const now = Date.now();
  const toSchedule: Array<{
    id: number;
    title: string;
    body: string;
    schedule: { at: Date };
  }> = [];

  for (const t of trackers) {
    if (t.status !== 'active') continue;

    for (const offset of t.reminderDays) {
      const target = new Date(`${t.expiryDate}T09:00:00`);
      target.setDate(target.getDate() - offset);
      if (target.getTime() <= now) continue;

      const amt = t.amountInr > 0 ? ` (${formatInr(t.amountInr)})` : '';
      const when =
        offset === 0 ? 'today!' : offset === 1 ? 'tomorrow!' : `in ${offset} days.`;

      toSchedule.push({
        id: hashIdToInt(`${t.id}-${offset}`),
        title: `DueGuard: ${t.title}${amt}`,
        body: t.autoRenews
          ? `Due ${when} Cancel before auto-renew charges.`
          : `Deadline ${when} Tap to review details.`,
        schedule: { at: target },
      });
    }
  }

  if (toSchedule.length > 0) {
    await LocalNotifications.schedule({ notifications: toSchedule.slice(0, 60) });
  }

  return { supported: true, scheduledCount: Math.min(toSchedule.length, 60) };
}

export async function sendBrowserTestNotification(): Promise<{
  ok: boolean;
  reason?: string;
}> {
  if (Capacitor.isNativePlatform()) {
    const perms = await LocalNotifications.requestPermissions();
    if (perms.display !== 'granted') {
      return { ok: false, reason: 'Android notification permission denied.' };
    }
    await LocalNotifications.schedule({
      notifications: [
        {
          id: 999001,
          title: 'DueGuard Alert Test',
          body: 'Android device notifications are active and working!',
          schedule: { at: new Date(Date.now() + 1500) },
        },
      ],
    });
    return { ok: true };
  }

  if (typeof Notification === 'undefined') {
    return { ok: false, reason: 'Browser notifications are not supported here.' };
  }

  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    return { ok: false, reason: 'Notification permission was not granted.' };
  }

  new Notification('DueGuard Alert Test', {
    body: 'Browser push alerts are enabled!',
    icon: '/pwa-192.png',
  });
  return { ok: true };
}
