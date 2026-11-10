export function isConfiguredFounder(authenticatedUserId, configuredOwnerId) {
  return typeof authenticatedUserId === 'string'
    && authenticatedUserId.length > 0
    && typeof configuredOwnerId === 'string'
    && configuredOwnerId.length > 0
    && authenticatedUserId === configuredOwnerId
}
