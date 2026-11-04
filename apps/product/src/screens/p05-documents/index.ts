import type { ScreenDef } from '../../types.js';
import { routes } from '../../routes.js';
import { Documents } from './Documents.js';
import { FirmQuestions, FirmRequests } from './FirmRequests.js';

const all = 'All Documents';
const company = 'Company Documents · Viewer & Add Folder';

/** Screens from Figma page "05 · Documents (Firm)". */
export const screens: ScreenDef[] = [{
  id: 'documents.all',
  title: 'Documents',
  figmaPage: '05 · Documents (Firm)',
  route: routes.documents,
  summary: 'Browse every document the firm holds by measurement date and company, and preview a file in place.',
  component: Documents,
  states: [
    { key: 'default', label: 'Documents — All Documents', figmaNode: '19:24011', section: all },
    { key: 'pdf-loading', label: 'Documents — Company selected · PDF loading', figmaNode: '19:38422', section: company },
    { key: 'pdf-viewer', label: 'Documents — PDF viewer', figmaNode: '19:44982', section: company },
    { key: 'add-folder', label: 'Documents — Add Folder modal', figmaNode: '19:47312', section: company },
    { key: 'parent-folder-picker', label: 'Documents — Add Folder · Parent Folder picker', figmaNode: '19:48713', section: company },
  ],
},
{
  id: 'documents.requests',
  title: 'Documents › Requests',
  figmaPage: '05 · Documents (Firm)',
  route: routes.firmDocuments.requests,
  summary: 'See every company’s information request at a glance — sent, resolved and pending documents and questions — and pick a company to open its requests.',
  component: FirmRequests,
  states: [
    { key: 'default', label: 'Requests — all companies overview', figmaNode: 'proto:firm-requests:1', section: 'Requests' },
  ],
},
{
  id: 'documents.requests.company',
  title: 'Documents › Requests · company selected',
  figmaPage: '05 · Documents (Firm)',
  route: routes.firmDocuments.companyRequests(':companyId'),
  summary: 'One company’s information request, picked from All Companies: the numbered list, who it went to, what came back and what is pending.',
  component: FirmRequests,
  states: [
    { key: 'default', label: 'Requests — company selected', figmaNode: 'proto:firm-requests:2', section: 'Requests' },
  ],
},
{
  id: 'documents.questions',
  title: 'Documents › Questions',
  figmaPage: '05 · Documents (Firm)',
  route: routes.firmDocuments.questions,
  summary: 'See how many questions each company still has to answer, and pick a company to read its answers.',
  component: FirmQuestions,
  states: [
    { key: 'default', label: 'Questions — all companies overview', figmaNode: 'proto:firm-questions:1', section: 'Questions' },
  ],
},
{
  id: 'documents.questions.company',
  title: 'Documents › Questions · company selected',
  figmaPage: '05 · Documents (Firm)',
  route: routes.firmDocuments.companyQuestions(':companyId'),
  summary: 'One company’s questions, pending and answered, picked from All Companies.',
  component: FirmQuestions,
  states: [
    { key: 'default', label: 'Questions — company selected', figmaNode: 'proto:firm-questions:2', section: 'Questions' },
  ],
}];
