/**
 * The avatar swatches offered in Settings.
 *
 * These are *data*, not styling: the chosen value is stored in `session.profile.avatarColor` and the
 * persistence layer only keeps `#rgb` / `#rrggbb`, so they must be hex. Every one is mid-tone enough
 * that the white-or-black initial picked by `readableOn` clears 4.5:1. `key` names the swatch for
 * assistive tech (`settings.colors.<key>`); the default profile colour (`#6366f1`) is the first one.
 */
export const AVATAR_COLORS = [
  { key: 'indigo', hex: '#6366f1' },
  { key: 'red', hex: '#ef4444' },
  { key: 'amber', hex: '#f59e0b' },
  { key: 'emerald', hex: '#10b981' },
  { key: 'sky', hex: '#0ea5e9' },
  { key: 'violet', hex: '#8b5cf6' },
  { key: 'pink', hex: '#ec4899' },
  { key: 'slate', hex: '#64748b' },
] as const;

export type AvatarColorKey = (typeof AVATAR_COLORS)[number]['key'];
