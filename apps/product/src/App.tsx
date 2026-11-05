/**
 * Scalar — the full product as a clickable prototype. Every route renders a
 * screen from the registry; `?state=` selects which Figma frame of it to show.
 * `#/catalog` lists every screen and state; `#/figma/<node-id>` jumps to the
 * screen drawn in that Figma frame.
 */
import { useEffect } from 'react';
import { useLocation, navigate } from './router.js';
import { redirectOf } from './routes.js';
import { resolve, byFigmaNode, examplePath } from './registry.js';
import { Catalog } from './Catalog.js';
import { NotFound } from './NotFound.js';
import { useContextKey } from './domain/context.js';
import { companyById } from './data/fixtures.js';

export function App() {
  const { path, query } = useLocation();

  const figma = path.match(/^\/figma\/(\d+[:-]\d+)$/);
  useEffect(() => {
    if (!figma) return;
    const hit = byFigmaNode(figma[1]!.replace('-', ':'));
    if (hit) navigate(examplePath(hit.screen), hit.state.key);
  }, [path]);

  useEffect(() => { window.scrollTo(0, 0); }, [path]);

  // A moved path replaces itself in history, so Back doesn't bounce through it.
  const moved = redirectOf(path);
  useEffect(() => {
    if (moved) window.location.replace(`#${moved}${query.toString() ? `?${query}` : ''}`);
  }, [moved, query]);

  const hit = path === '/catalog' || figma || moved ? undefined : resolve(path, query.get('state'));
  const companyId = hit?.params.companyId;
  // The company's measurement + versions. Changing either remounts the screen, so
  // its local edits start from the newly selected version — never the old one (P4).
  const contextKey = useContextKey(companyId ? companyById(companyId) : undefined);

  if (path === '/catalog') return <Catalog />;
  if (figma || moved) return null;
  if (!hit) return <NotFound path={path} />;
  const Screen = hit.screen.component;
  // key: remount on state change so local UI state starts from the frame.
  return <Screen key={`${path}?${hit.state.key}#${contextKey}`} state={hit.state.key} params={hit.params} />;
}
