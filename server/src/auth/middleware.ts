/**
 * JWT validation middleware for Colyseus room join.
 *
 * Usage inside ZoneRoom.onAuth():
 *
 *   async onAuth(client: Client, options: JoinOptions) {
 *     return verifyRoomToken(options.token);
 *   }
 *
 * The client must pass { token: "<accessToken>" } in joinOrCreate options.
 * On success, the returned payload is available as `this.clients[n].auth`.
 */

import { createVerifier } from "fast-jwt";
import type { AccessTokenPayload } from "./fastify";

const JWT_SECRET = process.env.JWT_SECRET ?? "pixelrealm-dev-secret-change-in-prod";

const verify = createVerifier({ key: JWT_SECRET });

export interface AuthPayload {
  userId: string;
  username: string;
}

/**
 * Verifies a JWT access token issued by the auth server.
 * Throws on invalid/expired token (Colyseus will reject the join).
 */
export async function verifyRoomToken(token: string | undefined): Promise<AuthPayload> {
  if (!token) throw new Error("Missing auth token");

  const payload = (await verify(token)) as AccessTokenPayload;
  return { userId: payload.sub, username: payload.username };
}
