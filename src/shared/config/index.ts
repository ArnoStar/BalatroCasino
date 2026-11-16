// Where the other parts of the site are. By default everything is on this
// origin: the portal at /, the game at /play/, the services at /items/,
// /social/ and /identity/ (the portal's nginx, or this dev server, passes them on).

function env(name: string): string {
  return ((import.meta.env as Record<string, string | undefined>)[name] ?? '').replace(/\/$/, '');
}

/** the item service (BalatroItemService): `<items_base>/v1/...`, the casino's games */
export const ITEMS_BASE = env('VITE_ITEMS_URL') || '/items';
/** the social service (BalatroSocial): friends, profile pictures */
export const SOCIAL_BASE = env('VITE_SOCIAL_URL') || '/social';
/** the identity service (BalatroIndentityService): the session's refresh */
export const IDENTITY_BASE = env('VITE_IDENTITY_URL') || '/identity';
/** the game API (BalatroWebAPI): `<api_base>/api/v1/...` */
export const API_BASE = env('VITE_API_URL');
/** the game (BalatroFrontEnd): the items' sprites, its language files */
export const GAME_URL = env('VITE_GAME_URL') || '/play';
/** the portal (BalatroPortal): sign-in, the account, profiles, items, trades */
export const PORTAL_URL = env('VITE_PORTAL_URL');

/** a page of the portal: `portal('/login')` */
export const portal = (path: string) => `${PORTAL_URL}${path}`;
