import type { ScreenDef } from '../../types.js';
import { routes } from '../../routes.js';
import { Documents } from './Documents.js';
import { FirmRequests } from './FirmRequests.js';

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
  summary: 'List + detail: pick a company on the left (pending first) and answer or upload its requests on the right without leaving the page.',
  component: FirmRequests,
  states: [
    { key: 'default', label: 'Requests — company list + request pane', figmaNode: 'proto:firm-requests:1', section: 'Requests' },
  ],
},
{
  id: 'documents.requests.company',
  title: 'Documents › Requests (company open)',
  figmaPage: '05 · Documents (Firm)',
  route: routes.firmDocuments.request(':companyId'),
  summary: 'Firm Requests deep-linked to one company: the same list + detail page with that company selected.',
  component: FirmRequests,
  states: [
    { key: 'default', label: 'Requests — one company open', figmaNode: 'proto:firm-requests:2', section: 'Requests' },
  ],
}
];
