/** Shared mutable application state (single source of truth). */
export const appState = {
  oreReference: null,
  ecosystemsCurated: null,
  planetTypesRef: null,
  db: null,
  systemPlanetsHasPositions: false,
  selectedSystemId: null,
  originSystemId: null,
  originSystemLabel: "",
  suggestionIndex: -1,
  allSystemSummaries: null,
  /** @type {Map<number, { max: number, avg: number, count: number }> | null} */
  systemFuelProspectById: null,
  suppressSearchClear: false,
};
