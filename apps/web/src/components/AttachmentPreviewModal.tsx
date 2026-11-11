import { useEffect, useState } from 'react';
import { Download, Loader2, Trash2, X } from 'lucide-react';
import { api } from '../lib/api';
import type { Tracker } from '../types';

interface AttachmentPreviewModalProps {
  tracker: Tracker | null;
  isCloudUser: boolean;
  onClose: () => void;
  onDeleteAttachment: (tracker: Tracker) => Promise<void>;
}

export function AttachmentPreviewModal({
  tracker,
  isCloudUser,
  onClose,
  onDeleteAttachment,
}: AttachmentPreviewModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tracker) return;
    let revoked = false;
    let objectUrl: string | null = null;

    if (!isCloudUser && tracker.localAttachmentDataUrl) {
      setImageUrl(tracker.localAttachmentDataUrl);
      setError(null);
      return;
    }

    if (isCloudUser && tracker.hasAttachment) {
      setLoading(true);
      setError(null);
      api
        .fetchAttachmentObjectUrl(tracker.id)
        .then((url) => {
          if (revoked) {
            URL.revokeObjectURL(url);
            return;
          }
          objectUrl = url;
          setImageUrl(url);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Failed to load image.');
        })
        .finally(() => setLoading(false));
    }

    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setImageUrl(null);
    };
  }, [tracker, isCloudUser]);

  if (!tracker) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {tracker.title} — Invoice / Screenshot
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tracker.attachmentName || 'Private vault attachment'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-64 items-center justify-center bg-slate-100 p-4 dark:bg-slate-950">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading encrypted vault image...
            </div>
          )}
          {error && <p className="text-sm text-rose-600">{error}</p>}
          {!loading && !error && imageUrl && (
            <img
              src={imageUrl}
              alt={tracker.attachmentName || 'Invoice screenshot'}
              className="max-h-[65vh] rounded-xl object-contain shadow-sm"
            />
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-slate-800">
          <button
            type="button"
            onClick={() => onDeleteAttachment(tracker)}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
          >
            <Trash2 className="h-4 w-4" />
            Remove Image
          </button>

          {imageUrl && (
            <a
              href={imageUrl}
              download={tracker.attachmentName || 'dueguard-invoice.webp'}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-teal-800"
            >
              <Download className="h-4 w-4" />
              Download Copy
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
