/**
 * Check if the current user has access to the Bible Maintenance tab.
 * Strictly restricted to the authorized administrator configured in .env.local.
 * No personal IDs are hardcoded here to protect privacy on GitHub.
 *
 * @param {Object|null} user - The Firebase Auth user object
 * @returns {boolean} True if the authenticated user matches the ID in .env.local
 */
export function isMaintenanceAllowed(user) {
  if (!user) return false;

  // Read admin ID / email from gitignored environment variable (.env.local)
  const envAdminId = (
    import.meta.env.VITE_MAINTENANCE_ID ||
    import.meta.env.VITE_MAINTENANCE_EMAIL ||
    ""
  ).toLowerCase().trim();

  // If no maintenance ID is configured in .env.local, access is denied to all
  if (!envAdminId) return false;

  const email = (user.email || "").toLowerCase().trim();
  const username = (user.username || "").toLowerCase().trim();
  const displayName = (user.displayName || "").toLowerCase().trim();
  const uid = (user.uid || "").toLowerCase().trim();

  // Exact match against configured ID (email, username, uid, or displayName)
  if (
    email === envAdminId ||
    username === envAdminId ||
    uid === envAdminId ||
    displayName === envAdminId
  ) {
    return true;
  }

  // If configured ID matches username/prefix, also match email prefix before @
  if (email && email.split("@")[0] === envAdminId) {
    return true;
  }

  return false;
}
