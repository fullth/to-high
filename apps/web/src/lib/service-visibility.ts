/**
 * Public launch switches for user-facing services that are still being built.
 *
 * Keep these disabled until the feature, policy, and production integration are
 * all ready. Disabled services return a real 404 instead of a "coming soon"
 * page so they are not advertised before launch.
 */
export const PUBLIC_SERVICE_VISIBILITY = {
  diary: false,
  subscription: false,
} as const;
