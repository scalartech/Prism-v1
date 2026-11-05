/**
 * Every route in the product, in one place. Screens link with
 * `href(routes.company.summary('abc-co'))`, never a hand-typed string, so the
 * information architecture can only change here.
 */
/** Company routes take the id; pass ':companyId' to get the route pattern. */
const c = (tail: string) => (companyId: string) => `/companies/${companyId}/${tail}`;

export const routes = {
  catalog: '/catalog',
  home: '/',
  portfolioHome: '/portfolio',
  intelligence: {
    summaries: '/intelligence/summaries',
    scheduleOfInvestments: '/intelligence/schedule-of-investments',
    dailyNav: '/intelligence/daily-nav',
  },
  valuations: '/valuations',
  waterfalls: '/waterfalls',
  documents: '/documents',
  /** Firm Documents' row-2 tabs: All documents (`documents`) · Requests. A company opens in its own context. */
  firmDocuments: {
    requests: '/documents/requests',
  },
  reports: '/reports',
  company: {
    summary: c('summary'),
    incomeStatement: c('financials/income-statement'),
    balanceSheet: c('financials/balance-sheet'),
    kpis: c('financials/kpis'),
    capTable: c('cap-table/securities'),
    fundOwnership: c('cap-table/fund-ownership'),
    breakpoints: c('cap-table/breakpoints'),
    cashFlowLedger: c('cap-table/cash-flow-ledger'),
    valuationSummary: c('valuations/summary'),
    valuationConclusions: c('valuations/conclusions'),
    backsolve: c('valuations/backsolve'),
    waterfall: c('waterfall'),
    documents: c('documents'),
    informationRequest: c('documents/information-request'),
    requests: c('documents/requests'),
    exports: c('documents/exports'),
    finalReport: c('documents/final-report'),
    overview: c('overview'),
    dailyNavSettings: c('daily-nav-settings'),
  },
  /** Prototypes with no Figma frame yet (see docs/product/domain-logic.md). */
  prototypes: {
    approach: (key: 'external-valuation' | 'specified-share-value' | 'public-comps' | 'transaction-comps') =>
      (companyId: string) => `/prototypes/approach/${companyId}/${key}`,
    respondentPortal: (requestId: string) => `/prototypes/respondent-portal/${requestId}`,
    requestPortal: (requestId: string) => `/prototypes/request-portal/${requestId}`,
    reportComposer: (companyId: string) => `/prototypes/report-composer/${companyId}`,
  },
  account: {
    settings: '/account/settings',
    twoFactor: '/account/two-factor',
  },
  admin: {
    users: '/admin/users',
    compGroups: '/admin/comp-groups',
    auditLogs: '/admin/audit-logs',
  },
  firmSettings: {
    profile: '/firm-settings/profile',
    sso: '/firm-settings/sso',
    scim: '/firm-settings/scim',
    dailyNav: '/firm-settings/daily-nav',
    dailyNavCompanies: '/firm-settings/daily-nav-companies',
    scalarAi: '/firm-settings/scalar-ai',
    settings: '/firm-settings/settings',
  },
} as const;


/**
 * Old links that moved. Questions folded into Requests at both levels, and a
 * company picked on firm Requests opens in its own context, so these paths
 * redirect instead of 404ing.
 */
const REDIRECTS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^\/documents\/questions$/, () => routes.firmDocuments.requests],
  [/^\/documents\/(?:questions|requests)\/([^/]+)$/, (m) => routes.company.requests(m[1]!)],
  [/^\/companies\/([^/]+)\/documents\/questions$/, (m) => routes.company.requests(m[1]!)],
];

/** Where an old path now lives, or undefined when it hasn't moved. */
export function redirectOf(path: string): string | undefined {
  for (const [re, to] of REDIRECTS) {
    const m = path.match(re);
    if (m) return to(m);
  }
  return undefined;
}

/** The pattern form of a company route, for ScreenDef.route. */
export const companyPattern = (f: (id: string) => string) => f(':companyId');
