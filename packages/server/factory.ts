// Factory functions for Masto instances

import { Datastore } from "./datastore";
import type { mastodon } from "masto";
import { login } from "masto";

// Convenient type aliases
type Client = mastodon.Client;

// Create a mastodon instance
function instance(domain: string, token: string) {
  return login({
    url: `https://${domain}`,
    accessToken: token,
  });
}

async function fromCookie(cookie: string): Promise<Client | null> {
  // Get auth info
  return Datastore.getAuth(cookie).then((auth) => {
    if (!auth) return null;

    return instance(auth.domain, auth.token);
  });
}

export const Factory = { fromCookie };
