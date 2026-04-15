/**
 * SIWE (Sign-In with Ethereum) helpers — EIP-4361.
 *
 * Builds the standard SIWE message string and verifies a personal_sign
 * signature using viem's verifyMessage. No external SIWE library needed;
 * the format is simple enough to build from spec.
 *
 * Reference: https://eips.ethereum.org/EIPS/eip-4361
 */

import { randomBytes } from "crypto";
import { verifyMessage, getAddress } from "viem";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SiweFields {
  domain: string;       // e.g. "pixelrealm.app"
  address: string;      // checksummed EIP-55 address
  statement: string;    // human-readable sign-in intent
  uri: string;          // EIP-4361 URI (the app URI)
  version: string;      // always "1"
  chainId: number;      // EIP-155 chain id (1 = Ethereum mainnet)
  nonce: string;        // unique per challenge, stored in Redis
  issuedAt: string;     // ISO 8601 timestamp
}

// ── Nonce ─────────────────────────────────────────────────────────────────────

/** Generate a cryptographically random nonce (32 hex chars). */
export function generateSiweNonce(): string {
  return randomBytes(16).toString("hex");
}

// ── Message builder ───────────────────────────────────────────────────────────

/**
 * Assemble the EIP-4361 message string.
 * The format is defined verbatim in the spec — do not change field order.
 */
export function buildSiweMessage(fields: SiweFields): string {
  return [
    `${fields.domain} wants you to sign in with your Ethereum account:`,
    fields.address,
    "",
    fields.statement,
    "",
    `URI: ${fields.uri}`,
    `Version: ${fields.version}`,
    `Chain ID: ${fields.chainId}`,
    `Nonce: ${fields.nonce}`,
    `Issued At: ${fields.issuedAt}`,
  ].join("\n");
}

// ── Message parser ────────────────────────────────────────────────────────────

/** Extract the Nonce field from an EIP-4361 message string. */
export function parseSiweNonce(message: string): string | null {
  const match = /^Nonce: (.+)$/m.exec(message);
  return match ? match[1].trim() : null;
}

/**
 * Extract and checksum the address from line 2 of an EIP-4361 message.
 * Returns null if the line is missing or not a valid EVM address.
 */
export function parseSiweAddress(message: string): string | null {
  const lines = message.split("\n");
  const raw = lines[1]?.trim();
  if (!raw || !raw.startsWith("0x")) return null;
  try {
    return getAddress(raw as `0x${string}`);
  } catch {
    return null;
  }
}

// ── Signature verifier ────────────────────────────────────────────────────────

/**
 * Verify a personal_sign signature against an EIP-4361 message.
 *
 * Returns the checksummed signer address if valid, or null.
 * Does NOT check the nonce — callers must validate the nonce against Redis.
 */
export async function verifySiweSignature(
  message: string,
  signature: string,
): Promise<string | null> {
  const expectedAddress = parseSiweAddress(message);
  if (!expectedAddress) return null;

  try {
    const valid = await verifyMessage({
      address: expectedAddress as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
    return valid ? expectedAddress : null;
  } catch {
    return null;
  }
}
