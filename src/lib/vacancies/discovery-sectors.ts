// The Discovery page's own sector filter, distinct from onboarding's
// SECTOR_OPTIONS (src/app/onboarding/constants.ts) -- that's a small
// career-focused list for sectors_of_interest/employer_sources tagging.
// This is the FAA API's actual 15 "route" categories -- the real, ground
// -truth values stored in vacancies.sector (confirmed live via a direct
// query, not the GET /vacancies/referencedata/courses/routes reference
// endpoint) -- so the filter buttons query directly with no lossy
// many-to-many translation in between, and use the short labels a
// competitor site (theapprenticeguide.net) already validated as clear to
// students searching the same underlying taxonomy.
export const DISCOVERY_SECTOR_OPTIONS: { label: string; route: string }[] = [
  { label: "Health & science", route: "Health and science" },
  { label: "Education", route: "Education and early years" },
  { label: "Business", route: "Business and administration" },
  { label: "Hospitality", route: "Catering and hospitality" },
  { label: "Engineering", route: "Engineering and manufacturing" },
  { label: "Sales & marketing", route: "Sales, marketing and procurement" },
  { label: "Legal & finance", route: "Legal, finance and accounting" },
  { label: "Digital", route: "Digital" },
  { label: "Care", route: "Care services" },
  { label: "Construction", route: "Construction and the built environment" },
  { label: "Transport", route: "Transport and logistics" },
  { label: "Hair & beauty", route: "Hair and beauty" },
  { label: "Agriculture", route: "Agriculture, environmental and animal care" },
  { label: "Creative", route: "Creative and design" },
  { label: "Protective", route: "Protective services" },
];
