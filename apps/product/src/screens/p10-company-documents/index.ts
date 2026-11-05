import type { ScreenDef } from '../../types.js';
import { routes, companyPattern } from '../../routes.js';
import { DocumentList } from './DocumentList.js';
import { InformationRequest } from './InformationRequest.js';
import { Requests } from './Requests.js';
import { Exports } from './Exports.js';
import { FinalReport } from './FinalReport.js';

const figmaPage = '10 · Company · Documents & Requests';

/** Screens from Figma page "10 · Company · Documents & Requests". */
export const screens: ScreenDef[] = [
  {
    id: 'company.documents.list',
    title: 'Documents',
    figmaPage,
    route: companyPattern(routes.company.documents),
    summary: 'See the company’s documents for the measurement date, upload new ones and track information requests.',
    component: DocumentList,
    states: [
      { key: 'default', label: 'Documents — Document List', figmaNode: '11:13664', section: 'Documents List' },
      { key: 'upload', label: 'Documents — Upload Document modal', figmaNode: '14:4176', section: 'Documents List' },
      { key: 'page-menu', label: 'Documents — Page menu open', figmaNode: '14:4259', section: 'Documents List' },
    ],
  },
  {
    id: 'company.documents.information-request',
    title: 'Information Request',
    figmaPage,
    route: companyPattern(routes.company.informationRequest),
    summary: 'Compose the documents and questions to request from the company and send them to a responsible contact.',
    component: InformationRequest,
    states: [
      { key: 'default', label: 'Information Request — New request', figmaNode: '16:13871', section: 'Information Request' },
      { key: 'responsible-picker', label: 'Information Request — Responsible picker open', figmaNode: '19:19795', section: 'Information Request' },
    ],
  },
  {
    id: 'company.documents.requests',
    title: 'Requests',
    figmaPage,
    route: companyPattern(routes.company.requests),
    summary: 'Track the information requests sent to the company: who they went to, what has been answered or uploaded, and what is still pending.',
    component: Requests,
    states: [
      { key: 'default', label: 'Requests — sent request, mixed responses', figmaNode: 'proto:company-requests:1', section: 'Requests' },
      { key: 'pending', label: 'Requests — pending responses only', figmaNode: 'proto:company-requests:2', section: 'Requests' },
      // Questions folded into Requests: the Questions empty frame is now Requests' empty state.
      { key: 'empty', label: 'Questions — Empty', figmaNode: '14:10616', section: 'Requests' },
    ],
  },
  {
    id: 'company.documents.exports',
    title: 'Exports',
    figmaPage,
    route: companyPattern(routes.company.exports),
    summary: 'The Excel exports made from Financials, Cap Table and Waterfall, by measurement date: who exported each one and when; download or delete.',
    component: Exports,
    states: [
      { key: 'default', label: 'Exports — by measurement date', figmaNode: 'proto:company-exports:1', section: 'Exports' },
      { key: 'empty', label: 'Exports — none yet', figmaNode: 'proto:company-exports:2', section: 'Exports' },
    ],
  },
  {
    id: 'company.documents.final-report',
    title: 'Final Report',
    figmaPage,
    route: companyPattern(routes.company.finalReport),
    summary: 'The one final report per measurement date: pick it from the PDF versions or upload one, preview before publishing, see when it goes out of date. Clients see only the final file.',
    component: FinalReport,
    states: [
      { key: 'default', label: 'Final Report — versions and preview, final out of date', figmaNode: 'proto:company-final-report:1', section: 'Final Report' },
      { key: 'empty', label: 'Final Report — none yet (analyst)', figmaNode: 'proto:company-final-report:2', section: 'Final Report' },
      { key: 'create', label: 'Final Report — create PDF export', figmaNode: 'proto:company-final-report:3', section: 'Final Report' },
      { key: 'render-failed', label: 'Final Report — PDF can’t render, download instead', figmaNode: 'proto:company-final-report:4', section: 'Final Report' },
      { key: 'client', label: 'Final Report — client view', figmaNode: 'proto:company-final-report:5', section: 'Final Report' },
      { key: 'client-empty', label: 'Final Report — client view, not published yet', figmaNode: 'proto:company-final-report:6', section: 'Final Report' },
    ],
  },
];
