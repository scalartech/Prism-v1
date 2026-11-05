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
  summary: 'Every company’s information request in one table — pending, resolved / total, due date, last activity — pending first; a company opens in its own context.',
  component: FirmRequests,
  states: [
    { key: 'default', label: 'Requests — one company table, pending first', figmaNode: 'proto:firm-requests:1', section: 'Requests' },
  ],
}
];
