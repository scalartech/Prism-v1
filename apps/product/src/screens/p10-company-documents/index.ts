import type { ScreenDef } from '../../types.js';
import { routes, companyPattern } from '../../routes.js';
import { DocumentList } from './DocumentList.js';
import { InformationRequest } from './InformationRequest.js';
import { Questions } from './Questions.js';
import { Requests } from './Requests.js';

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
    id: 'company.documents.questions',
    title: 'Questions',
    figmaPage,
    route: companyPattern(routes.company.questions),
    summary: 'See which questions sent in information requests are still waiting for an answer, and read the answers that came back.',
    component: Questions,
    states: [
      { key: 'default', label: 'Questions — pending and answered', figmaNode: 'proto:company-questions:1', section: 'Questions' },
      { key: 'empty', label: 'Questions — Empty', figmaNode: '14:10616', section: 'Questions' },
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
      { key: 'empty', label: 'Requests — nothing sent yet', figmaNode: 'proto:company-requests:3', section: 'Requests' },
    ],
  },
];
