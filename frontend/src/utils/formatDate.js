/**
 * Format an ISO date string into a human-readable relative label.
 * e.g. "Today", "Yesterday", "Mon, Sep 25"
 */
export function formatRelativeDate(isoString) {
  if (!isoString) return '';
  const date   = new Date(isoString);
  const now    = new Date();
  const today  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (target.getTime() === today.getTime()) return 'Today';
  if (target.getTime() === yesterday.getTime()) return 'Yesterday';

  // Within the last 7 days → show weekday name
  const diff = (today - target) / 86400000;
  if (diff < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Format just a time string e.g. "3:42 PM" */
export function formatTime(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
