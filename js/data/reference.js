import { appState } from '../core/state.js';
import { ORE_REFERENCE_URL, ECOSYSTEMS_CURATED_URL, PLANET_TYPES_URL } from '../config/constants.js';
export async function loadOreReference() {
  const response = await fetch(ORE_REFERENCE_URL);
  if (!response.ok) {
    throw new Error(`Could not load ore reference (${response.status})`);
  }
  appState.oreReference = await response.json();
}


export async function loadEcosystemsCurated() {
  const response = await fetch(ECOSYSTEMS_CURATED_URL);
  if (!response.ok) {
    console.warn(`Curated ecosystem guide not loaded (${response.status})`);
    appState.ecosystemsCurated = null;
    return;
  }
  appState.ecosystemsCurated = await response.json();
}


export async function loadPlanetTypes() {
  const response = await fetch(PLANET_TYPES_URL);
  if (!response.ok) {
    throw new Error(`Could not load ${PLANET_TYPES_URL}`);
  }
  appState.planetTypesRef = await response.json();
}

