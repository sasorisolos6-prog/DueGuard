import { useState } from 'react';
import {
  BellRing,
  Calendar,
  Check,
  Copy,
  Download,
  Loader2,
  Mail,
  Send,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import { isNativeAndroid, sendBrowserTestNotification, syncLocalDeviceNotifications } from '../lib/notifications';
import { downloadIcsFile, downloadJsonFile } from '../lib/utils';
import type { Tracker, UserProfile } from '../types';

interface AlertsSettingsModalProps {
  isOpen: boolean;
  user: UserProfile | null;
  trackers: Tracker[];
  onClose: () => void;
  onRefreshUser: () => Promise<void>;
  onAccountDeleted: () => void;
  onToast: (msg: string) => void;
}

export function AlertsSettingsModal({
  isOpen,
  user,
  trackers,
  onClose,
  onRefreshUser,
  onAccountDeleted,
  onToast,
}: AlertsSettingsModalProps) {
  const [linkCode, setLinkCode] = useState<string | null>(user?.telegramLinkCode ?? null);
  const [botUsername, setBotUsername] = useState<string | null>(user?.telegramBotUsername ?? null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!isOpen) return null;

  async function toggleEmailAlerts(enabled: boolean) {
    if (!user) return;
    setBusy('email');
    try {
      await api.updateSettings({ emailAlertsEnabled: enabled });
      await onRefreshUser();
      onToast(enabled ? 'Email alerts enabled.' : 'Email alerts paused.');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Failed to update settings.');
    } finally {
      setBusy(null);
    }
  }

  async function handleGenerateTelegramCode() {
    setBusy('tg-code');
    try {
      const res = await api.generateTelegramLinkCode();
      setLinkCode(res.code);
      setBotUsername(res.botUsername);
      await onRefreshUser();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Could not generate code.');
    } finally {
      setBusy(null);
    }
  }

  async function handleSyncTelegram() {
    setBusy('tg-sync');
    try {
      const res = await api.syncTelegramLink();
      if (res.linked) {
        await onRefreshUser();
        onToast('Telegram linked successfully!');
      } else {
        onToast(res.message || 'Not linked yet — send the /start code to your bot first.');
      }
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Telegram check failed.');
    } finally {
      setBusy(null);
    }
  }

  async function handleTestTelegram() {
    setBusy('tg-test');
    try {
      const res = await api.testTelegramAlert();
      onToast(
        res.simulated
          ? 'Test logged to API console (add TELEGRAM_BOT_TOKEN in .dev.vars for live Telegram).'
          : 'Test alert sent to your Telegram!'
      );
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Test failed.');
    } finally {
      setBusy(null);
    }
  }

  async function handleUnlinkTelegram() {
    setBusy('tg-unlink');
    try {
      await api.unlinkTelegram();
      setLinkCode(null);
      await onRefreshUser();
      onToast('Telegram disconnected.');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Unlink failed.');
    } finally {
      setBusy(null);
    }
  }

  async function handleDeviceNotificationsTest() {
    setBusy('device');
    try {
      if (isNativeAndroid()) {
        const res = await syncLocalDeviceNotifications(trackers);
        await sendBrowserTestNotification();
        onToast(`Synced ${res.scheduledCount} Android local reminders!`);
      } else {
        const res = await sendBrowserTestNotification();
        onToast(res.ok ? 'Test notification triggered!' : res.reason || 'Could not notify.');
      }
    } finally {
      setBusy(null);
    }
  }

  async function handleExportJson() {
    setBusy('export');
    try {
      if (user) {
        const data = await api.exportAccount();
        downloadJsonFile(data, `dueguard-backup-${new Date().toISOString().slice(0, 10)}.json`);
      } else {
        downloadJsonFile(
          { exportedAt: new Date().toISOString(), mode: 'local-demo', trackers },
          `dueguard-local-backup-${new Date().toISOString().slice(0, 10)}.json`
        );
      }
      onToast('JSON backup downloaded.');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setBusy(null);
    }
  }

  async function handleDeleteAccount() {
    if (!user) return;
    setBusy('delete');
    try {
      await api.deleteAccount();
      onAccountDeleted();
      onClose();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Account deletion failed.');
    } finally {
      setBusy(null);
      setConfirmDelete(false);
    }
  }

  const commandText = linkCode ? `/start ${linkCode}` : '';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-xs sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Reminders, Backup & Vault Privacy
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Device / Browser Notifications */}
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Smartphone className="h-5 w-5 text-teal-600" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {isNativeAndroid() ? 'Android Local Alarms' : 'Device & Browser Alerts'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Works offline inside the Android APK or supported browsers
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={busy === 'device'}
                onClick={handleDeviceNotificationsTest}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <BellRing className="h-3.5 w-3.5" />
                Test / Sync
              </button>
            </div>
          </div>

          {/* Cloud Channels */}
          {user ? (
            <>
              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Mail className="h-5 w-5 text-teal-600" />
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        Daily Email Reminders
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Sent at 8:30 AM IST to {user.email}
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    disabled={busy === 'email'}
                    checked={user.emailAlertsEnabled}
                    onChange={(e) => toggleEmailAlerts(e.target.checked)}
                    className="h-4 w-4 accent-teal-700"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Send className="h-5 w-5 text-sky-600" />
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        Telegram Bot Alerts (₹0 Forever)
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {user.telegramLinked
                          ? 'Connected! Instant alerts arrive in your Telegram chat.'
                          : 'Link your Telegram account for reliable zero-cost push alerts.'}
                      </p>
                    </div>
                  </div>
                  {user.telegramLinked && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      Linked
                    </span>
                  )}
                </div>

                {user.telegramLinked ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy === 'tg-test'}
                      onClick={handleTestTelegram}
                      className="rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
                    >
                      Send Test Ping
                    </button>
                    <button
                      type="button"
                      disabled={busy === 'tg-unlink'}
                      onClick={handleUnlinkTelegram}
                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {linkCode ? (
                      <div className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-950">
                        <p className="text-slate-600 dark:text-slate-300">
                          1. Open{' '}
                          {botUsername ? (
                            <a
                              href={`https://t.me/${botUsername}?start=${linkCode}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-sky-600 underline"
                            >
                              @{botUsername}
                            </a>
                          ) : (
                            <strong>your DueGuard Telegram bot</strong>
                          )}{' '}
                          and send:
                        </p>
                        <div className="mt-1.5 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs dark:border-slate-800 dark:bg-slate-900">
                          <span>{commandText}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(commandText);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 1500);
                            }}
                            className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-400"
                          >
                            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            {copied ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            disabled={busy === 'tg-sync'}
                            onClick={handleSyncTelegram}
                            className="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
                          >
                            {busy === 'tg-sync' && <Loader2 className="h-3 w-3 animate-spin" />}
                            Verify Connection
                          </button>
                          <button
                            type="button"
                            onClick={handleGenerateTelegramCode}
                            className="rounded-lg px-2 py-1.5 text-xs text-slate-500 hover:underline"
                          >
                            New Code
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={busy === 'tg-code'}
                        onClick={handleGenerateTelegramCode}
                        className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                      >
                        Generate Link Code
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              Sign in with a free <strong>Cloud Sync</strong> account to enable automated daily Email & Telegram reminders even when your phone or browser is closed.
            </div>
          )}

          {/* No Lock-in Data Export */}
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              No Lock-In Data Portability
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Export every tracker anytime—your data always belongs to you.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExportJson}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Download className="h-3.5 w-3.5" />
                Export JSON Backup
              </button>
              <button
                type="button"
                onClick={() => {
                  const active = trackers.filter((t) => t.status === 'active');
                  downloadIcsFile(active.length > 0 ? active : trackers);
                  onToast('Calendar (.ics) file downloaded.');
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Calendar className="h-3.5 w-3.5" />
                Export All to Calendar (.ics)
              </button>
            </div>
          </div>

          {/* Delete Account or Reset Local Vault */}
          {user ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 dark:border-rose-900/60 dark:bg-rose-950/20">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-rose-800 dark:text-rose-300">
                    Delete Account & Wipe Vault
                  </h3>
                  <p className="text-xs text-rose-600/90 dark:text-rose-400">
                    Permanently deletes your account, trackers, alert logs, and uploaded screenshots.
                  </p>
                </div>
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-1 rounded-xl border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                ) : (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-lg px-2 py-1 text-xs text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={busy === 'delete'}
                      onClick={handleDeleteAccount}
                      className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700"
                    >
                      Confirm Wipe
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Reset Local Demo Vault
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Clears any locally created demo items and restores default samples.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onAccountDeleted();
                    onClose();
                  }}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Reset Vault
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
