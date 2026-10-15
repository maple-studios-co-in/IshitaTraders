/**
 * Caption scenes of the homepage hero film. Kept free of image imports so the admin's settings
 * schema (which also runs in the browser) can use it.
 */

/** Number of caption scenes; the film is cut into this many equal chapters. */
export const HERO_SCENE_COUNT = 8;

/** Scene shown at a given film progress (0–1): each scene takes over half-way into its chapter. */
export const sceneAt = (progress: number) =>
  Math.min(HERO_SCENE_COUNT - 1, Math.max(0, Math.floor(progress * HERO_SCENE_COUNT + 0.5)));

/** What the film shows during each scene, so captions can be written to match (admin hints). */
export const heroSceneHints = [
  "Opening — aerial view of the plant. This is also the page's main heading.",
  "Flying in over the factory.",
  "Rooftop solar arrays.",
  "Arriving at the main hall.",
  "Inside the production floor.",
  "Panels standing in the field.",
  "Exploded solar panel — shown extra large.",
  "Desert to city skyline — the closing line.",
];

/** Type size per scene: the exploded panel gets the big statement, the closing line sits smaller. */
export const heroSceneSizes = ["md", "md", "md", "md", "md", "md", "xl", "sm"] as const;

/** Captions as designed (Figma keyframes at frames 000, 054, 108 and 139, plus the scenes between). */
export const defaultHeroScenes = [
  "ISHITA TRADERS — SOLAR & POWER SOLUTIONS",
  "Supply. Installation. Service.",
  "Built to Last. Engineered for Bihar.",
  "Reliable Power. Closer to You.",
  "Precision in Every Installation.",
  "Installed Here. Serviced Here.",
  "Power Beyond\nthe Surface.",
  "From Sunlight — to Everyday Life.",
];
