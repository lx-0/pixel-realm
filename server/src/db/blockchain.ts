/**
 * server/src/db/blockchain.ts
 *
 * Server-side blockchain integration for Pixel Realm NFTs.
 *
 * Uses ethers.js v6 with a JsonRpcProvider connected to Base Sepolia.
 * The server holds a MINTER_ROLE key that can mint items/land to player wallets.
 * Marketplace interactions happen client-side (players sign their own transactions
 * via MetaMask). This module provides:
 *   - mintItem(to, itemTypeId, amount)
 *   - mintLand(to, zoneId, plotIndex)
 *   - getNFTInventory(walletAddress)
 *   - getMarketplaceListings(fromId?, count?)
 */

import { ethers } from "ethers";
import { logger } from "../logger";

// ── ABI fragments (only the functions we call) ──────────────────────────────

const ITEMS_ABI = [
  "function mint(address to, uint256 itemTypeId, uint256 amount) external",
  "function mintBatch(address to, uint256[] calldata itemTypeIds, uint256[] calldata amounts) external",
  "function balanceOf(address account, uint256 id) external view returns (uint256)",
  "function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids) external view returns (uint256[] memory)",
] as const;

const LAND_ABI = [
  "function mint(address to, uint256 plotTokenId, string calldata zoneId, uint256 plotIndex) external",
  "function getTokenId(string memory zoneId, uint256 plotIndex) external pure returns (uint256)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)",
  "function tokenZone(uint256 tokenId) external view returns (string)",
  "function tokenPlotIndex(uint256 tokenId) external view returns (uint256)",
] as const;

const MARKETPLACE_ABI = [
  "function totalListings() external view returns (uint256)",
  "function getListings(uint256 fromId, uint256 count) external view returns (tuple(uint256 listingId, address seller, address tokenContract, uint8 tokenType, uint256 tokenId, uint256 amount, uint256 priceWei, bool active)[] memory)",
  "function getListing(uint256 listingId) external view returns (tuple(uint256 listingId, address seller, address tokenContract, uint8 tokenType, uint256 tokenId, uint256 amount, uint256 priceWei, bool active))",
  "function getListingIdsBySeller(address seller) external view returns (uint256[] memory)",
] as const;

// ── Provider / wallet setup ──────────────────────────────────────────────────

let _provider: ethers.JsonRpcProvider | null = null;
let _minterWallet: ethers.Wallet | null = null;

function getProvider(): ethers.JsonRpcProvider {
  if (!_provider) {
    const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL;
    if (!rpcUrl) throw new Error("BASE_SEPOLIA_RPC_URL not set");
    _provider = new ethers.JsonRpcProvider(rpcUrl);
  }
  return _provider;
}

function getMinterWallet(): ethers.Wallet {
  if (!_minterWallet) {
    const pk = process.env.MINTER_PRIVATE_KEY;
    if (!pk) throw new Error("MINTER_PRIVATE_KEY not set");
    _minterWallet = new ethers.Wallet(pk, getProvider());
  }
  return _minterWallet;
}

function getItemsContract(): ethers.Contract {
  const addr = process.env.ITEMS_CONTRACT_ADDRESS;
  if (!addr) throw new Error("ITEMS_CONTRACT_ADDRESS not set");
  return new ethers.Contract(addr, ITEMS_ABI, getMinterWallet());
}

function getLandContract(): ethers.Contract {
  const addr = process.env.LAND_CONTRACT_ADDRESS;
  if (!addr) throw new Error("LAND_CONTRACT_ADDRESS not set");
  return new ethers.Contract(addr, LAND_ABI, getMinterWallet());
}

function getMarketplaceContract(): ethers.Contract {
  const addr = process.env.MARKETPLACE_CONTRACT_ADDRESS;
  if (!addr) throw new Error("MARKETPLACE_CONTRACT_ADDRESS not set");
  // Read-only — use provider (no wallet needed)
  return new ethers.Contract(addr, MARKETPLACE_ABI, getProvider());
}

// ── Minting ──────────────────────────────────────────────────────────────────

/**
 * Mint ERC-1155 items to a player's wallet.
 * Requires MINTER_PRIVATE_KEY to hold MINTER_ROLE on the Items contract.
 */
export async function mintItem(
  to: string,
  itemTypeId: number,
  amount: number,
): Promise<{ txHash: string }> {
  logger.info({ event: "nft.mintItem", to, itemTypeId, amount }, "minting item NFT");
  const contract = getItemsContract();
  const tx = await contract.mint(to, itemTypeId, amount);
  await tx.wait(1);
  logger.info({ event: "nft.mintItem.confirmed", txHash: tx.hash }, "item NFT minted");
  return { txHash: tx.hash };
}

/**
 * Batch-mint multiple ERC-1155 item types to a player's wallet.
 */
export async function mintItemBatch(
  to: string,
  itemTypeIds: number[],
  amounts: number[],
): Promise<{ txHash: string }> {
  logger.info({ event: "nft.mintItemBatch", to, itemTypeIds, amounts }, "batch minting item NFTs");
  const contract = getItemsContract();
  const tx = await contract.mintBatch(to, itemTypeIds, amounts);
  await tx.wait(1);
  return { txHash: tx.hash };
}

/**
 * Mint an ERC-721 land plot to a player's wallet.
 */
export async function mintLand(
  to: string,
  zoneId: string,
  plotIndex: number,
): Promise<{ txHash: string; tokenId: string }> {
  logger.info({ event: "nft.mintLand", to, zoneId, plotIndex }, "minting land NFT");
  const contract = getLandContract();
  // Compute deterministic token ID
  const tokenId: bigint = await contract.getTokenId(zoneId, plotIndex);
  const tx = await contract.mint(to, tokenId, zoneId, plotIndex);
  await tx.wait(1);
  logger.info({ event: "nft.mintLand.confirmed", txHash: tx.hash, tokenId: tokenId.toString() }, "land NFT minted");
  return { txHash: tx.hash, tokenId: tokenId.toString() };
}

// ── Inventory queries ────────────────────────────────────────────────────────

export interface NFTInventory {
  items: Array<{ itemTypeId: number; balance: string }>;
  land: Array<{ tokenId: string; zoneId: string; plotIndex: string }>;
}

/**
 * Query a player's NFT holdings from the blockchain.
 * itemTypeIds is the list of item types to check balances for.
 */
export async function getNFTInventory(
  walletAddress: string,
  itemTypeIds: number[] = [],
): Promise<NFTInventory> {
  const provider = getProvider();

  const itemsAddr = process.env.ITEMS_CONTRACT_ADDRESS;
  const landAddr = process.env.LAND_CONTRACT_ADDRESS;

  const itemsContract = itemsAddr
    ? new ethers.Contract(itemsAddr, ITEMS_ABI, provider)
    : null;
  const landContract = landAddr
    ? new ethers.Contract(landAddr, LAND_ABI, provider)
    : null;

  // ── Items balances ──────────────────────────────────────────────────────────
  const itemsResult: NFTInventory["items"] = [];
  if (itemsContract && itemTypeIds.length > 0) {
    const accounts = itemTypeIds.map(() => walletAddress);
    const balances: bigint[] = await itemsContract.balanceOfBatch(accounts, itemTypeIds);
    for (let i = 0; i < itemTypeIds.length; i++) {
      if (balances[i] > 0n) {
        itemsResult.push({ itemTypeId: itemTypeIds[i], balance: balances[i].toString() });
      }
    }
  }

  // ── Land tokens ─────────────────────────────────────────────────────────────
  const landResult: NFTInventory["land"] = [];
  if (landContract) {
    const balance: bigint = await landContract.balanceOf(walletAddress);
    for (let i = 0n; i < balance; i++) {
      const tokenId: bigint = await landContract.tokenOfOwnerByIndex(walletAddress, i);
      const zoneId: string = await landContract.tokenZone(tokenId);
      const plotIndex: bigint = await landContract.tokenPlotIndex(tokenId);
      landResult.push({
        tokenId: tokenId.toString(),
        zoneId,
        plotIndex: plotIndex.toString(),
      });
    }
  }

  return { items: itemsResult, land: landResult };
}

// ── Marketplace queries ──────────────────────────────────────────────────────

export interface MarketplaceListing {
  listingId: string;
  seller: string;
  tokenContract: string;
  tokenType: "ERC1155" | "ERC721";
  tokenId: string;
  amount: string;
  priceWei: string;
  priceEth: string;
  active: boolean;
}

function formatListing(raw: {
  listingId: bigint;
  seller: string;
  tokenContract: string;
  tokenType: number;
  tokenId: bigint;
  amount: bigint;
  priceWei: bigint;
  active: boolean;
}): MarketplaceListing {
  return {
    listingId: raw.listingId.toString(),
    seller: raw.seller,
    tokenContract: raw.tokenContract,
    tokenType: raw.tokenType === 0 ? "ERC1155" : "ERC721",
    tokenId: raw.tokenId.toString(),
    amount: raw.amount.toString(),
    priceWei: raw.priceWei.toString(),
    priceEth: ethers.formatEther(raw.priceWei),
    active: raw.active,
  };
}

/**
 * Fetch active marketplace listings from the blockchain.
 * Paginates through listings starting from `fromId` (1-based).
 */
export async function getMarketplaceListings(
  fromId = 1,
  count = 50,
): Promise<MarketplaceListing[]> {
  const contract = getMarketplaceContract();
  const raw = await contract.getListings(fromId, count);
  return (raw as Array<typeof raw[0]>)
    .map(formatListing)
    .filter((l) => l.active);
}

/**
 * Fetch all active listings for a specific seller.
 */
export async function getListingsBySeller(
  sellerAddress: string,
): Promise<MarketplaceListing[]> {
  const contract = getMarketplaceContract();
  const ids: bigint[] = await contract.getListingIdsBySeller(sellerAddress);
  const listings = await Promise.all(
    ids.map((id) => contract.getListing(id)),
  );
  return (listings as Array<typeof listings[0]>)
    .map(formatListing)
    .filter((l) => l.active);
}
