/**
 * Wallet linking routes — M14a (PIX-154)
 *
 * Endpoints:
 *   GET  /auth/wallet/challenge  — issue a SIWE (EIP-4361) challenge for an address
 *   POST /auth/wallet/link       — verify signature, link wallet to session player
 *   DELETE /auth/wallet/unlink   — remove wallet link from session player
 *
 * Auth model:
 *   All three routes require a valid JWT access token (Bearer).
 *   challenge also requires ?address= so the message is pre-bound to the caller's address.
 *
 * Replay protection:
 *   Nonces are stored in Redis under siwe_nonce:{nonce} with a 60 s TTL.
 *   Each nonce is consumed on first successful verify (deleted).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getAddress } from "viem";
import { getRedis } from "./redis";
import {
  generateSiweNonce,
  buildSiweMessage,
  parseSiweNonce,
  verifySiweSignature,
} from "./siwe";
import { linkPlayerWallet, unlinkPlayerWallet, findPlayerById } from "../db/players";
import { config } from "../config";
import type { AccessTokenPayload } from "./fastify";

const SIWE_NONCE_TTL_S = 60;

// ── Helpers ───────────────────────────────────────────────────────────────────

function requireAuth(req: FastifyRequest, reply: FastifyReply): boolean {
  if (!req.user) {
    reply.code(401).send({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// ── Route registrar ───────────────────────────────────────────────────────────

export async function registerWalletRoutes(app: FastifyInstance): Promise<void> {
  // ── GET /auth/wallet/challenge ────────────────────────────────────────────
  // Returns a SIWE message string for the caller to sign.
  // ?address=0x...  (required) — the EVM address the player wants to link.
  app.get(
    "/auth/wallet/challenge",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      preHandler: async (req, reply) => {
        try { await req.jwtVerify(); } catch { reply.code(401).send({ error: "Unauthorized" }); }
      },
      schema: {
        querystring: {
          type: "object",
          required: ["address"],
          properties: {
            address: { type: "string", minLength: 42, maxLength: 42 },
          },
        },
      },
    },
    async (req: FastifyRequest<{ Querystring: { address: string } }>, reply: FastifyReply) => {
      // Checksum the address to catch any casing issues early
      let checksumAddress: string;
      try {
        checksumAddress = getAddress(req.query.address as `0x${string}`);
      } catch {
        return reply.code(400).send({ error: "Invalid Ethereum address" });
      }

      const nonce = generateSiweNonce();
      const redis = getRedis();
      await redis.set(`siwe_nonce:${nonce}`, "1", "EX", SIWE_NONCE_TTL_S);

      const message = buildSiweMessage({
        domain: config.siweDomain,
        address: checksumAddress,
        statement: "Sign in to PixelRealm to link your wallet.",
        uri: config.siweUri,
        version: "1",
        chainId: 1, // Ethereum mainnet
        nonce,
        issuedAt: new Date().toISOString(),
      });

      return reply.send({ message, nonce });
    },
  );

  // ── POST /auth/wallet/link ────────────────────────────────────────────────
  // Verifies a SIWE signature and links the recovered address to the player.
  app.post(
    "/auth/wallet/link",
    {
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
      preHandler: async (req, reply) => {
        try { await req.jwtVerify(); } catch { reply.code(401).send({ error: "Unauthorized" }); }
      },
      schema: {
        body: {
          type: "object",
          required: ["message", "signature"],
          properties: {
            message:   { type: "string", minLength: 1 },
            signature: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (req: FastifyRequest<{ Body: { message: string; signature: string } }>, reply: FastifyReply) => {
      if (!requireAuth(req, reply)) return;
      const payload = req.user as AccessTokenPayload;

      const { message, signature } = req.body;

      // 1. Verify signature — recovers signer address or returns null
      const signerAddress = await verifySiweSignature(message, signature);
      if (!signerAddress) {
        return reply.code(400).send({ error: "Invalid signature" });
      }

      // 2. Consume the nonce (replay protection)
      const nonce = parseSiweNonce(message);
      if (!nonce) {
        return reply.code(400).send({ error: "Malformed SIWE message: missing nonce" });
      }
      const redis = getRedis();
      const consumed = await redis.del(`siwe_nonce:${nonce}`);
      if (consumed === 0) {
        return reply.code(400).send({ error: "Nonce expired or already used" });
      }

      // 3. Link wallet to player
      try {
        await linkPlayerWallet(payload.sub, signerAddress);
      } catch (err: unknown) {
        if (err instanceof Error && err.message === "WALLET_TAKEN") {
          return reply.code(409).send({ error: "Wallet address already linked to another account" });
        }
        req.log.error(err);
        return reply.code(500).send({ error: "Failed to link wallet" });
      }

      return reply.send({ walletAddress: signerAddress });
    },
  );

  // ── DELETE /auth/wallet/unlink ────────────────────────────────────────────
  // Removes the wallet link from the session player.
  app.delete(
    "/auth/wallet/unlink",
    {
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
      preHandler: async (req, reply) => {
        try { await req.jwtVerify(); } catch { reply.code(401).send({ error: "Unauthorized" }); }
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      if (!requireAuth(req, reply)) return;
      const payload = req.user as AccessTokenPayload;

      // Verify player exists (also guards against stale tokens)
      const player = await findPlayerById(payload.sub);
      if (!player) {
        return reply.code(404).send({ error: "Player not found" });
      }

      await unlinkPlayerWallet(payload.sub);
      return reply.send({ ok: true });
    },
  );

  // ── GET /auth/wallet/status ───────────────────────────────────────────────
  // Returns the linked wallet address for the session player (or null).
  app.get(
    "/auth/wallet/status",
    {
      preHandler: async (req, reply) => {
        try { await req.jwtVerify(); } catch { reply.code(401).send({ error: "Unauthorized" }); }
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      if (!requireAuth(req, reply)) return;
      const payload = req.user as AccessTokenPayload;

      const player = await findPlayerById(payload.sub);
      if (!player) {
        return reply.code(404).send({ error: "Player not found" });
      }

      return reply.send({
        walletAddress: player.walletAddress ?? null,
        walletLinkedAt: player.walletLinkedAt ?? null,
      });
    },
  );
}
