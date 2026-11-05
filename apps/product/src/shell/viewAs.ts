/**
 * Prototype "View as" — who is looking at the product: a Scalar analyst (the
 * default) or a client user of the portfolio company. One switch for every
 * screen that differs by role (Final Report, company and firm Requests, firm
 * Reports), so one demo covers both. Kept in this browser; a real build reads
 * the role from the session.
 */
import { usePersisted, writePersisted } from '../screens/p10-company-documents/persisted.js';

export type Viewer = 'analyst' | 'client';

const KEY = 'scalar.prototype.view-as';
const seed = (): Viewer => 'analyst';

export const viewerLabel: Record<Viewer, string> = { analyst: 'Scalar analyst', client: 'Client user' };

/** The current viewer and a setter; every screen re-renders when it changes. */
export function useViewAs(): [Viewer, (v: Viewer) => void] {
  const [v, set] = usePersisted<Viewer>(KEY, seed);
  return [v, set];
}

export const setViewAs = (v: Viewer) => writePersisted(KEY, v);
