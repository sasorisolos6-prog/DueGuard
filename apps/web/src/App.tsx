import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarRange,
  LayoutGrid,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Shield,
} from 'lucide-react';
import { AlertsSettingsModal } from './components/AlertsSettingsModal';
import { AttachmentPreviewModal } from './components/AttachmentPreviewModal';
import { AuthModal } from './components/AuthModal';
import { HeroTrustBanner } from './components/HeroTrustBanner';
import { Navbar } from './components/Navbar';
import { SpendBreakdown } from './components/SpendBreakdown';
import { SummaryCards } from './components/SummaryCards';
import { TimelineView } from './components/TimelineView';
import { TrackerCard } from './components/TrackerCard';
import { TrackerModal } from './components/TrackerModal';
import { api, getStoredToken, setStoredToken } from './lib/api';
import {
  computeLocalSummary,
  createDemoTracker,
  loadDemoTrackers,
  resetDemoTrackers,
  saveDemoTrackers,
} from './lib/demoStorage';
import { syncLocalDeviceNotifications } from './lib/notifications';
import {
  addDaysToIso,
  computeNextRenewalDateLocal,
  daysUntil,
  downloadIcsFile,
  fileToDataUrl,
  formatFriendlyDate,
  formatInr,
  getTodayLocalIso,
} from './lib/utils';
import type { Tracker, TrackerFormInput, UserProfile } from './types';

type FilterTab =
  | 'active'
  | 'urgent'
  | 'trial_sub'
  | 'return_window'
  | 'warranty'
  | 'recharge'
  | 'archived';

type ViewMode = 'cards' | 'timeline';
type SortMode = 'expiry' | 'amount' | 'recent';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const FILTER_TABS: Array<{ id: FilterTab; label: string }> = [
  { id: 'active', label: 'All Active' },
  { id: 'urgent', label: 'Urgent (≤7d)' },
  { id: 'trial_sub', label: 'Trials & Subs' },
  { id: 'return_window', label: 'Returns' },
  { id: 'warranty', label: 'Warranties' },
  { id: 'recharge', label: 'Recharges' },
  { id: 'archived', label: 'Done / Cancelled' },
];

export function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('dueguard_theme') === 'dark');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [trackers, setTrackers] = useState<Tracker[]>(() => loadDemoTrackers());
  const [loading, setLoading] = useState(Boolean(getStoredToken()));
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('active');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [sortMode, setSortMode] = useState<SortMode>('expiry');
  const [bannerDismissed, setBannerDismissed] = useState(
    () => sessionStorage.getItem('dueguard_banner_dismissed') === '1'
  );
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [trackerModalOpen, setTrackerModalOpen] = useState(false);
  const [editingTracker, setEditingTracker] = useState<Tracker | null>(null);
  const [previewTracker, setPreviewTracker] = useState<Tracker | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);

  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('dueguard_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const loadCloudData = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setTrackers(loadDemoTrackers());
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [meRes, trackersRes] = await Promise.all([api.getMe(), api.getTrackers()]);
      setUser(meRes.user);
      setTrackers(trackersRes.trackers);
    } catch {
      setStoredToken(null);
      setUser(null);
      setTrackers(loadDemoTrackers());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCloudData();
  }, [loadCloudData]);

  useEffect(() => {
    if (!user) saveDemoTrackers(trackers);
    syncLocalDeviceNotifications(trackers).catch(() => {});
  }, [trackers, user]);

  const summary = useMemo(() => computeLocalSummary(trackers), [trackers]);

  const filteredTrackers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return trackers
      .filter((t) => {
        if (activeTab === 'archived') {
          if (t.status === 'active') return false;
        } else {
          if (t.status !== 'active') return false;
          if (activeTab === 'urgent' && daysUntil(t.expiryDate) > 7) return false;
          if (activeTab === 'trial_sub' && t.category !== 'trial' && t.category !== 'subscription') {
            return false;
          }
          if (activeTab === 'return_window' && t.category !== 'return_window') return false;
          if (activeTab === 'warranty' && t.category !== 'warranty' && t.category !== 'document') {
            return false;
          }
          if (activeTab === 'recharge' && t.category !== 'recharge') return false;
        }

        if (!q) return true;
        return (
          t.title.toLowerCase().includes(q) ||
          t.notes.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortMode === 'amount') return b.amountInr - a.amountInr;
        if (sortMode === 'recent') return b.createdAt.localeCompare(a.createdAt);
        return a.expiryDate.localeCompare(b.expiryDate);
      });
  }, [trackers, activeTab, search, sortMode]);

  async function handleInstallPwa() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      showToast('DueGuard installed as an app!');
      setInstallPrompt(null);
    }
  }

  async function handleSaveTracker(
    input: TrackerFormInput,
    attachmentFile: File | null,
    editingId?: string
  ) {
    if (!user) {
      let dataUrl: string | null | undefined;
      if (attachmentFile) {
        dataUrl = await fileToDataUrl(attachmentFile);
      }

      if (editingId) {
        setTrackers((prev) =>
          prev.map((item) =>
            item.id === editingId
              ? {
                  ...item,
                  ...input,
                  hasAttachment: Boolean(dataUrl) || item.hasAttachment,
                  attachmentName: attachmentFile?.name ?? item.attachmentName,
                  attachmentMime: attachmentFile?.type ?? item.attachmentMime,
                  localAttachmentDataUrl: dataUrl ?? item.localAttachmentDataUrl,
                  updatedAt: new Date().toISOString(),
                }
              : item
          )
        );
        showToast('Updated local tracker.');
      } else {
        const created = createDemoTracker(input);
        if (dataUrl && attachmentFile) {
          created.hasAttachment = true;
          created.attachmentName = attachmentFile.name;
          created.attachmentMime = attachmentFile.type;
          created.localAttachmentDataUrl = dataUrl;
        }
        setTrackers((prev) => [created, ...prev]);
        showToast('Tracker saved locally.');
      }
      return;
    }

    let saved: Tracker;
    if (editingId) {
      const res = await api.updateTracker(editingId, input);
      saved = res.tracker;
    } else {
      const res = await api.createTracker(input);
      saved = res.tracker;
    }

    if (attachmentFile) {
      const attachRes = await api.uploadAttachment(saved.id, attachmentFile);
      saved = attachRes.tracker;
    }

    await loadCloudData();
    showToast(editingId ? 'Tracker updated.' : 'Tracker protected!');
  }

  async function handleMarkStatus(tracker: Tracker, status: Tracker['status']) {
    const cancelledToast =
      tracker.amountInr > 0
        ? `Saved ${formatInr(tracker.amountInr)}! Total saved: ${formatInr(summary.savedInr + tracker.amountInr)}`
        : 'Marked cancelled — nice save!';

    if (!user) {
      setTrackers((prev) =>
        prev.map((t) =>
          t.id === tracker.id ? { ...t, status, updatedAt: new Date().toISOString() } : t
        )
      );
      showToast(
        status === 'cancelled'
          ? cancelledToast
          : status === 'active'
            ? 'Restored to active!'
            : 'Marked done.'
      );
      return;
    }

    try {
      await api.updateTracker(tracker.id, { status });
      await loadCloudData();
      showToast(
        status === 'cancelled'
          ? cancelledToast
          : status === 'active'
            ? 'Restored to active!'
            : 'Marked done.'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed.');
    }
  }

  async function handleRenewTracker(tracker: Tracker) {
    if (!user) {
      const nextDate = computeNextRenewalDateLocal(tracker);
      setTrackers((prev) =>
        prev.map((t) =>
          t.id === tracker.id
            ? { ...t, expiryDate: nextDate, status: 'active', updatedAt: new Date().toISOString() }
            : t
        )
      );
      showToast(`Renewed! Next due date: ${formatFriendlyDate(nextDate)}`);
      return;
    }

    try {
      const res = await api.renewTracker(tracker.id);
      await loadCloudData();
      showToast(`Renewed! Next due date: ${formatFriendlyDate(res.tracker.expiryDate)}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Renew failed.');
    }
  }

  async function handleSnoozeTracker(tracker: Tracker) {
    if (!user) {
      const today = getTodayLocalIso();
      const base = tracker.expiryDate < today ? today : tracker.expiryDate;
      const snoozedDate = addDaysToIso(base, 2);
      setTrackers((prev) =>
        prev.map((t) =>
          t.id === tracker.id
            ? { ...t, expiryDate: snoozedDate, status: 'active', updatedAt: new Date().toISOString() }
            : t
        )
      );
      showToast(`Snoozed to ${formatFriendlyDate(snoozedDate)}`);
      return;
    }

    try {
      const res = await api.snoozeTracker(tracker.id, 2);
      await loadCloudData();
      showToast(`Snoozed to ${formatFriendlyDate(res.tracker.expiryDate)}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Snooze failed.');
    }
  }

  async function handleDeleteTracker(tracker: Tracker) {
    if (!user) {
      setTrackers((prev) => prev.filter((t) => t.id !== tracker.id));
      showToast('Tracker deleted.');
      return;
    }

    try {
      await api.deleteTracker(tracker.id);
      await loadCloudData();
      showToast('Tracker & vault file deleted.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  async function handleDeleteAttachment(tracker: Tracker) {
    if (!user) {
      setTrackers((prev) =>
        prev.map((t) =>
          t.id === tracker.id
            ? {
                ...t,
                hasAttachment: false,
                attachmentName: null,
                attachmentMime: null,
                localAttachmentDataUrl: null,
              }
            : t
        )
      );
      setPreviewTracker(null);
      showToast('Image removed.');
      return;
    }

    try {
      await api.deleteAttachment(tracker.id);
      setPreviewTracker(null);
      await loadCloudData();
      showToast('Invoice image deleted from vault.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete image.');
    }
  }

  function handleLogout() {
    setStoredToken(null);
    setUser(null);
    setTrackers(loadDemoTrackers());
    showToast('Signed out. Switched back to Local Demo.');
  }

  return (
    <div className="min-h-screen w-full overflow-x-clip bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Navbar
        user={user}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((d) => !d)}
        onOpenNewTracker={() => {
          setEditingTracker(null);
          setTrackerModalOpen(true);
        }}
        onOpenAlerts={() => setAlertsModalOpen(true)}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      <main className="mx-auto w-full max-w-6xl space-y-5 px-3 pb-24 pt-4 sm:px-6 sm:pb-12 sm:pt-5">
        {!user && !bannerDismissed && (
          <HeroTrustBanner
            canInstallPwa={Boolean(installPrompt)}
            onDismiss={() => {
              sessionStorage.setItem('dueguard_banner_dismissed', '1');
              setBannerDismissed(true);
            }}
            onOpenAuth={() => setAuthModalOpen(true)}
            onInstallPwa={handleInstallPwa}
          />
        )}

        <SummaryCards summary={summary} />

        <SpendBreakdown trackers={trackers} />

        {/* Search, Sort & View Controls */}
        <section className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex max-w-full gap-1.5 overflow-x-auto pb-1">
            {FILTER_TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-56 sm:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Search items, order IDs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 outline-none focus:border-teal-600 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              aria-label="Sort trackers"
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-teal-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="expiry">Soonest Due</option>
              <option value="amount">Highest ₹</option>
              <option value="recent">Recently Added</option>
            </select>

            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                title="Cards view"
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                  viewMode === 'cards'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                title="Timeline view"
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                  viewMode === 'timeline'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <CalendarRange className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Timeline</span>
              </button>
            </div>
          </div>
        </section>

        {/* Tracker Content */}
        {loading ? (
          <div className="flex min-h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
          </div>
        ) : filteredTrackers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
            <Shield className="mx-auto h-9 w-9 text-teal-600/80" />
            <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
              Nothing in this view yet
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Add a free trial, return window, mobile recharge, or warranty with 1 tap.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingTracker(null);
                  setTrackerModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
              >
                <Plus className="h-4 w-4" />
                Add Your First Tracker
              </button>
              {!user && (
                <button
                  type="button"
                  onClick={() => {
                    setTrackers(resetDemoTrackers());
                    showToast('Restored 4 sample items.');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restore Demo Samples
                </button>
              )}
            </div>
          </div>
        ) : viewMode === 'timeline' ? (
          <TimelineView
            trackers={filteredTrackers}
            onEdit={(t) => {
              setEditingTracker(t);
              setTrackerModalOpen(true);
            }}
            onRenew={handleRenewTracker}
            onMarkStatus={handleMarkStatus}
          />
        ) : (
          <section className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filteredTrackers.map((tracker) => (
              <TrackerCard
                key={tracker.id}
                tracker={tracker}
                onEdit={(t) => {
                  setEditingTracker(t);
                  setTrackerModalOpen(true);
                }}
                onMarkStatus={handleMarkStatus}
                onRenew={handleRenewTracker}
                onSnooze={handleSnoozeTracker}
                onDelete={handleDeleteTracker}
                onPreviewAttachment={(t) => setPreviewTracker(t)}
                onExportIcs={(t) => {
                  downloadIcsFile([t], `${t.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`);
                  showToast('Calendar reminder (.ics) downloaded.');
                }}
              />
            ))}
          </section>
        )}

        <footer className="border-t border-slate-200/80 pt-5 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          DueGuard
        </footer>
      </main>

      {/* Mobile Floating Add Button */}
      <button
        type="button"
        onClick={() => {
          setEditingTracker(null);
          setTrackerModalOpen(true);
        }}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-teal-700 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-teal-800 sm:hidden"
      >
        <Plus className="h-5 w-5" />
        Add
      </button>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 z-50 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-center text-xs font-semibold text-white shadow-lg sm:bottom-5 dark:bg-white dark:text-slate-900">
          {toast}
        </div>
      )}

      {/* Modals */}
      <TrackerModal
        isOpen={trackerModalOpen}
        editingTracker={editingTracker}
        onClose={() => setTrackerModalOpen(false)}
        onSave={handleSaveTracker}
      />

      <AttachmentPreviewModal
        tracker={previewTracker}
        isCloudUser={Boolean(user)}
        onClose={() => setPreviewTracker(null)}
        onDeleteAttachment={handleDeleteAttachment}
      />

      <AuthModal
        isOpen={authModalOpen}
        localTrackers={user ? [] : trackers}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={async (token, message) => {
          setStoredToken(token);
          await loadCloudData();
          showToast(message);
        }}
      />

      <AlertsSettingsModal
        isOpen={alertsModalOpen}
        user={user}
        trackers={trackers}
        onClose={() => setAlertsModalOpen(false)}
        onRefreshUser={loadCloudData}
        onAccountDeleted={() => {
          setStoredToken(null);
          setUser(null);
          setTrackers(loadDemoTrackers());
          showToast('Account & all vault files permanently deleted.');
        }}
        onToast={showToast}
      />
    </div>
  );
}

export default App;
