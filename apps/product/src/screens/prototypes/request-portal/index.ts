import type { ScreenDef } from '../../../types.js';
import { RequestPortal } from './RequestPortal.js';

/**
 * Prototype — the unified request portal: questions and documents in one
 * numbered list, five response types, real templates re-uploaded to the same
 * request. Each state loads a fixture set into the same list (P2.2).
 */
export const screens: ScreenDef[] = [
  {
    id: 'prototype.request-portal',
    title: 'Unified Request Portal (prototype)',
    figmaPage: 'Prototype · request-portal',
    route: '/prototypes/request-portal/:requestId',
    summary: 'An external contact works through one numbered list of information requests — answers, dates, Yes/No, documents and completed templates — and sees truthfully what is resolved.',
    component: RequestPortal,
    states: [
      { key: 'default', label: 'Request Portal — mixed request types', figmaNode: 'proto:request-portal:1', section: 'Prototype' },
      { key: 'questions-only', label: 'Request Portal — questions only', figmaNode: 'proto:request-portal:2', section: 'Prototype' },
      { key: 'documents-only', label: 'Request Portal — documents only', figmaNode: 'proto:request-portal:3', section: 'Prototype' },
      { key: 'templates-only', label: 'Request Portal — templates only', figmaNode: 'proto:request-portal:4', section: 'Prototype' },
      { key: 'all-complete', label: 'Request Portal — every request resolved', figmaNode: 'proto:request-portal:5', section: 'Prototype' },
      { key: 'empty', label: 'Request Portal — no requests', figmaNode: 'proto:request-portal:6', section: 'Prototype' },
    ],
  },
];
