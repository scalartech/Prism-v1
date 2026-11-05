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
    summary: 'Every company’s Final Report for the header’s measurement date — Published, Out of date, Not created — with the ones that need work first.',
    component: Reports,
    states: [
      { key: 'default', label: 'Reports — final report status by company', figmaNode: 'proto:reports:1', section: 'Prototype' },
    ],
  },
];
