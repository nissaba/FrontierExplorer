export const LIKELIHOOD_TIER = {
  LOW: { label: "Low", score: 0.2 },
  MEDIUM: { label: "Medium", score: 0.5 },
  HIGH: { label: "High", score: 0.9 },
};
export const SITE_TAXONOMY = [
  {
    keywords: ["Blue Drift"],
    category: "Outer Belt Site Type",
    classification: "Dangerous / Combat Resource",
    activity: "Clear the hostile variant, then mine what remains.",
    yield: "The combat-heavy branch of the outer-belt family — bring shields and low expectations.",
    description:
      "Blue Drift is the outer-belt site type that remembered to bring guns. The Guide classifies it as Shale/Grove's less sociable sibling.",
  },
  {
    keywords: ["Shale", "Grove"],
    category: "Outer Belt Site Type",
    classification: "Industrial / Resource",
    activity: "Mine and salvage in the long chill of the outer ring.",
    yield: "Named outer-belt prospects in the extract — not a guarantee of what your hold will contain.",
    description:
      "Shale and Grove mark cold-ring water and ice scouting on the map. Whether the rocks cooperate is between you and your laser.",
  },
  {
    keywords: ["Drone Nest", "Osa Drone", "Minor Drone"],
    category: "PvE Combat Dungeon",
    classification: "Dangerous / Hostile AI Present",
    activity: "Ship combat, destroying drone hulls, and wreck salvaging.",
    yield: "Drone components, raw salvage, and basic progression items.",
    description:
      "Active hive structures controlled by rogue feral drones. Highly dangerous for unshielded or light harvesting vessels. Demands a combat-fitted hull to clear.",
  },
  {
    keywords: ["Surveyor", "Okryda Surveyor"],
    category: "Elite Combat / Patrol Node",
    classification: "High Threat",
    activity: "Tactical combat against specialized patrolling scanner units.",
    yield: "High-tier tech salvage and advanced ship module components.",
    description:
      "Automated reconnaissance points guarded by elite Feral AI surveyors. These units feature enhanced tracking and will aggressively defend their spatial boundary.",
  },
  {
    keywords: [
      "Inculcator",
      "Ruined Inculcator",
      "Razed Inculcator",
      "Inculcator Wreckage",
      "Inculcator Foundation",
    ],
    category: "Structural Remnants & Faction Wreckage",
    classification: "Combat / Scavenging",
    activity: "Clearing localized structural defenses and harvesting broken hulls.",
    yield: "Fused alloy plating, shattered tech relics, and structural components.",
    description:
      "Debris fields and decaying remains of ancient Inculcator installations. Often guarded by automated defense grids or lingering scavengers.",
  },
  {
    keywords: ["Archive Wreckage", "Silo Block", "Unmoored Silo"],
    category: "Exploration & Hackable Data Vaults",
    classification: "Scavenging / Logic Hack",
    activity: "Specialized data extraction, cracking containers, and looting vaults.",
    yield: "Encrypted data drives, blueprint copies, and utility software strings.",
    description:
      "Drifting data vaults and storage silos uncoupled from lost orbital platforms. Approach carefully — some still object to being opened.",
  },
  {
    keywords: ["Ferris", "Ferris Asteroid Field"],
    category: "Metal-Rich Mining Node",
    classification: "Industrial / Resource",
    activity: "Strip mining and heavy mineral extraction.",
    yield: "High-density iron, heavy metals, and manufacturing structural alloys.",
    description:
      "A concentrated cluster of dense, metal-rich planetary debris. Primary source for structural metals required to print basic hulls, armor plates, and kinetic ammunition.",
  },
  {
    keywords: ["Feldspar", "Crystal Belt"],
    category: "Base Mineral Deposit",
    classification: "Industrial / Resource",
    activity: "Basic mineral laser mining.",
    yield: "Base silicates, carbonaceous compounds, and common industrial crystals.",
    description:
      "Standard elemental debris belt containing widespread crystalline structures and silicates. Vital for foundational component printing and everyday module construction.",
  },
  {
    keywords: ["Mining Platform", "Crumbling Mining Platform"],
    category: "Abandoned Industrial Infrastructure",
    classification: "Scavenging / Mining Hybrid",
    activity: "Salvaging derelict industrial equipment and loose surface materials.",
    yield: "Pre-processed ore packets, scrap metal, and baseline industrial machinery.",
    description:
      "A defunct, unanchored mining station slowly tearing apart under local planetary gravity. Offers immediate salvage opportunities for passing industrial ships.",
  },
  {
    keywords: ["Shipyard", "Shipyard Ruins", "Destroyed Shipyard"],
    category: "Static System Hub",
    classification: "Landmarks / Spatial Anchors",
    activity: "Point of interest navigation, structural exploration, and heavy salvaging.",
    yield: "System-wide map data, heavy hull plating ruins, and historic data logs.",
    description:
      "The skeletal, permanent superstructure of a system-defining shipyard. Serves as a major navigational anchor point and the structural heart of local space history.",
  },
  {
    keywords: ["L-Point", "Lagrange", "Lagrange Point"],
    category: "Orbital Gravitational Equilibrium Coordinate",
    classification: "Infrastructure / Base-Building Plot",
    activity: "Establishing persistent player bases, defensive turrets, and Tribe Network Nodes.",
    yield: "Spatial dominance and localized grid network connectivity.",
    description:
      "A gravimetric dead-zone ideal for anchoring heavy permanent structures. This coordinate acts as a staging ground for collaborative player outposts and defense nets.",
  },
  {
    keywords: ["Stargate", "Stargate Site"],
    category: "Interstellar Jump Infrastructure",
    classification: "Transit Choke-point",
    activity: "Cross-system travel, line-of-sight navigation, and tactical fleet staging.",
    yield: "Strategic positional advantage and gate traffic routing.",
    description:
      "The vital interstellar gateway connecting systems across the Frontier. Highly trafficked and often used as a defensive bottleneck or ambush vector.",
  },
];

export const WATER_ICE_SCOUT_TOOLTIP =
  "Qualitative water/ice scouting read from outer Shale, Grove, and Drift site names on the map — not a guarantee in your hold.";
