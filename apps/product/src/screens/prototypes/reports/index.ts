import type { ScreenDef } from '../../../types.js';
import { routes } from '../../../routes.js';
import { Reports } from './Reports.js';

/** Prototype — the Reports area: the portfolio roll-up of every company's Final Report. */
export const screens: ScreenDef[] = [
  {
    id: 'prototype.reports',
    title: 'Reports (prototype)',
    figmaPage: 'Prototype · reports',
    route: routes.reports,
    summary: 'List + preview: every company’s Final Report status on the left (the ones that need work first); the selected company’s report on the right.',
    component: Reports,
    states: [
      { key: 'default', label: 'Reports — company list + report preview', figmaNode: 'proto:reports:1', section: 'Prototype' },
    ],
  },
  {
    id: 'prototype.reports.company',
    title: 'Reports (company open)',
    figmaPage: 'Prototype · reports',
    route: routes.report(':companyId'),
    summary: 'Reports deep-linked to one company: the same list + preview with that company’s final report open.',
    component: Reports,
    states: [
      { key: 'default', label: 'Reports — one company open', figmaNode: 'proto:reports:2', section: 'Prototype' },
    ],
  },
];
