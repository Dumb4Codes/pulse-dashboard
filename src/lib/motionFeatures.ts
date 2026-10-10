// Loaded on demand by <ShellMotion/> so the ~25 kB layout/drag feature set never blocks first paint.
// `domMax` (not `domAnimation`) because the nav pill uses `layoutId` shared-layout projection,
// and the feed's drag-to-reorder (Reorder) needs the same set.
export { domMax as default } from 'framer-motion';
