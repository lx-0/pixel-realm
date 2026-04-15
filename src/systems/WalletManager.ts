/**
 * src/systems/WalletManager.ts
 *
 * Browser-side wallet connection and NFT contract interaction for Pixel Realm.
 *
 * Handles:
 *   - MetaMask / EIP-1193 provider detection and connection
 *   - Contract instances for PixelRealmItems (ERC-1155), PixelRealmLand (ERC-721),
 *     and PixelRealmMarketplace
 *   - Marketplace actions: listERC1155, listERC721, buyItem, cancelListing
 *
 * The server holds MINTER_ROLE and mints tokens to the player's connected wallet
 * on gameplay events.  All marketplace transactions are signed by the player's
 * own wallet (MetaMask).
 */

import { ethers } from "ethers";

// ── Contract ABIs ────────────────────────────────────────────────────────────

const ITEMS_ABI = [
  "function balanceOf(address account, uint256 id) external view returns (uint256)",
  "function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids) external view returns (uint256[] memory)",
  "function setApprovalForAll(address operator, bool approved) external",
  "function isApprovedForAll(address account, address operator) external view returns (bool)",
] as const;

const LAND_ABI = [
  "function balanceOf(address owner) external view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)",
  "function tokenZone(uint256 tokenId) external view returns (string)",
  "function tokenPlotIndex(uint256 tokenId) external view returns (uint256)",
  "function approve(address to, uint256 tokenId) external",
  "function getApproved(uint256 tokenId) external view returns (address)",
  "function setApprovalForAll(address operator, bool approved) external",
  "function isApprovedForAll(address account, address operator) external view returns (bool)",
] as const;

const MARKETPLACE_ABI = [
  "function listERC1155(address tokenContract, uint256 tokenId, uint256 amount, uint256 priceWei) external returns (uint256 listingId)",
  "function listERC721(address tokenContract, uint256 tokenId, uint256 priceWei) external returns (uint256 listingId)",
  "function buyItem(uint256 listingId) external payable",
  "function cancelListing(uint256 listingId) external",
  "function getListing(uint256 listingId) external view returns (tuple(uint256 listingId, address seller, address tokenContract, uint8 tokenType, uint256 tokenId, uint256 amount, uint256 priceWei, bool active))",
  "function getListings(uint256 fromId, uint256 count) external view returns (tuple(uint256 listingId, address seller, address tokenContract, uint8 tokenType, uint256 tokenId, uint256 amount, uint256 priceWei, bool active)[] memory)",
  "function getListingIdsBySeller(address seller) external view returns (uint256[] memory)",
  "function totalListings() external view returns (uint256)",
  "event ItemListed(uint256 indexed listingId, address indexed seller, address indexed tokenContract, uint8 tokenType, uint256 tokenId, uint256 amount, uint256 priceWei)",
  "event ItemSold(uint256 indexed listingId, address indexed buyer, address indexed seller, uint256 priceWei, uint256 royaltyPaid, uint256 platformFeePaid, uint256 sellerProceeds)",
  "event ListingCancelled(uint256 indexed listingId, address indexed seller)",
] as const;

// ── Types ────────────────────────────────────────────────────────────────────

export interface Listing {
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

export interface WalletState {
  connected: boolean;
  address: string | null;
  chainId: number | null;
}

// ── WalletManager ─────────────────────────────────────────────────────────────

export class WalletManager {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;

  private itemsAddress: string;
  private landAddress: string;
  private marketplaceAddress: string;

  public state: WalletState = { connected: false, address: null, chainId: null };

  // Listeners for UI updates
  private onStateChange: ((state: WalletState) => void) | null = null;

  constructor(opts: {
    itemsAddress: string;
    landAddress: string;
    marketplaceAddress: string;
    onStateChange?: (state: WalletState) => void;
  }) {
    this.itemsAddress = opts.itemsAddress;
    this.landAddress = opts.landAddress;
    this.marketplaceAddress = opts.marketplaceAddress;
    this.onStateChange = opts.onStateChange ?? null;
  }

  // ── Connection ──────────────────────────────────────────────────────────────

  isMetaMaskAvailable(): boolean {
    return typeof window !== "undefined" && !!(window as { ethereum?: unknown }).ethereum;
  }

  async connect(): Promise<WalletState> {
    if (!this.isMetaMaskAvailable()) {
      throw new Error("MetaMask is not installed. Please install it at https://metamask.io");
    }

    const ethereum = (window as { ethereum: ethers.Eip1193Provider }).ethereum;
    this.provider = new ethers.BrowserProvider(ethereum);

    // Request account access
    await this.provider.send("eth_requestAccounts", []);
    this.signer = await this.provider.getSigner();

    const address = await this.signer.getAddress();
    const network = await this.provider.getNetwork();

    this.state = {
      connected: true,
      address,
      chainId: Number(network.chainId),
    };

    // Register event listeners for account/chain changes
    ethereum.on("accountsChanged", (accounts: string[]) => {
      this.state = {
        ...this.state,
        address: accounts[0] ?? null,
        connected: accounts.length > 0,
      };
      this._emitStateChange();
    });

    ethereum.on("chainChanged", () => {
      // Reload on chain change (recommended by MetaMask docs)
      window.location.reload();
    });

    this._emitStateChange();
    return this.state;
  }

  disconnect(): void {
    this.provider = null;
    this.signer = null;
    this.state = { connected: false, address: null, chainId: null };
    this._emitStateChange();
  }

  private _emitStateChange(): void {
    this.onStateChange?.(this.state);
  }

  // ── Contract accessors ──────────────────────────────────────────────────────

  private _requireSigner(): ethers.JsonRpcSigner {
    if (!this.signer) throw new Error("Wallet not connected");
    return this.signer;
  }

  private _requireProvider(): ethers.BrowserProvider {
    if (!this.provider) throw new Error("Wallet not connected");
    return this.provider;
  }

  private get itemsContract(): ethers.Contract {
    return new ethers.Contract(this.itemsAddress, ITEMS_ABI, this._requireSigner());
  }

  private get landContract(): ethers.Contract {
    return new ethers.Contract(this.landAddress, LAND_ABI, this._requireSigner());
  }

  private get marketplaceContract(): ethers.Contract {
    return new ethers.Contract(this.marketplaceAddress, MARKETPLACE_ABI, this._requireSigner());
  }

  private get marketplaceReadOnly(): ethers.Contract {
    return new ethers.Contract(this.marketplaceAddress, MARKETPLACE_ABI, this._requireProvider());
  }

  // ── Approval helpers ────────────────────────────────────────────────────────

  async approveItemsForMarketplace(): Promise<void> {
    const approved = await this.itemsContract.isApprovedForAll(
      this.state.address,
      this.marketplaceAddress,
    );
    if (!approved) {
      const tx = await this.itemsContract.setApprovalForAll(this.marketplaceAddress, true);
      await tx.wait(1);
    }
  }

  async approveLandForMarketplace(tokenId: string): Promise<void> {
    const approved = await this.landContract.getApproved(tokenId);
    const isOperator = await this.landContract.isApprovedForAll(
      this.state.address,
      this.marketplaceAddress,
    );
    if (approved.toLowerCase() !== this.marketplaceAddress.toLowerCase() && !isOperator) {
      const tx = await this.landContract.approve(this.marketplaceAddress, tokenId);
      await tx.wait(1);
    }
  }

  // ── Marketplace interactions ────────────────────────────────────────────────

  /**
   * List an ERC-1155 item for sale.
   * Approves the marketplace contract if not already approved.
   */
  async listItem(
    itemTypeId: number,
    amount: number,
    priceEth: string,
  ): Promise<{ listingId: string; txHash: string }> {
    await this.approveItemsForMarketplace();
    const priceWei = ethers.parseEther(priceEth);
    const tx = await this.marketplaceContract.listERC1155(
      this.itemsAddress,
      itemTypeId,
      amount,
      priceWei,
    );
    const receipt = await tx.wait(1);
    const iface = new ethers.Interface(MARKETPLACE_ABI);
    let listingId = "0";
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "ItemListed") {
          listingId = parsed.args.listingId.toString();
          break;
        }
      } catch {
        // not this log
      }
    }
    return { listingId, txHash: tx.hash };
  }

  /**
   * List an ERC-721 land token for sale.
   * Approves the marketplace contract if not already approved.
   */
  async listLand(
    tokenId: string,
    priceEth: string,
  ): Promise<{ listingId: string; txHash: string }> {
    await this.approveLandForMarketplace(tokenId);
    const priceWei = ethers.parseEther(priceEth);
    const tx = await this.marketplaceContract.listERC721(
      this.landAddress,
      tokenId,
      priceWei,
    );
    const receipt = await tx.wait(1);
    const iface = new ethers.Interface(MARKETPLACE_ABI);
    let listingId = "0";
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "ItemListed") {
          listingId = parsed.args.listingId.toString();
          break;
        }
      } catch {
        // not this log
      }
    }
    return { listingId, txHash: tx.hash };
  }

  /**
   * Purchase a listing by ID.
   * Sends exactly the listed priceWei as msg.value.
   */
  async buyItem(listingId: string, priceWei: string): Promise<{ txHash: string }> {
    const tx = await this.marketplaceContract.buyItem(listingId, {
      value: BigInt(priceWei),
    });
    await tx.wait(1);
    return { txHash: tx.hash };
  }

  /**
   * Cancel an active listing and reclaim the escrowed token.
   */
  async cancelListing(listingId: string): Promise<{ txHash: string }> {
    const tx = await this.marketplaceContract.cancelListing(listingId);
    await tx.wait(1);
    return { txHash: tx.hash };
  }

  // ── Read methods ─────────────────────────────────────────────────────────────

  async getListings(fromId = 1, count = 50): Promise<Listing[]> {
    const raw = await this.marketplaceReadOnly.getListings(fromId, count);
    return (raw as Array<{
      listingId: bigint;
      seller: string;
      tokenContract: string;
      tokenType: number;
      tokenId: bigint;
      amount: bigint;
      priceWei: bigint;
      active: boolean;
    }>)
      .filter((l) => l.active)
      .map((l) => ({
        listingId: l.listingId.toString(),
        seller: l.seller,
        tokenContract: l.tokenContract,
        tokenType: l.tokenType === 0 ? ("ERC1155" as const) : ("ERC721" as const),
        tokenId: l.tokenId.toString(),
        amount: l.amount.toString(),
        priceWei: l.priceWei.toString(),
        priceEth: ethers.formatEther(l.priceWei),
        active: l.active,
      }));
  }

  async getMyListings(): Promise<Listing[]> {
    if (!this.state.address) return [];
    const ids: bigint[] = await this.marketplaceReadOnly.getListingIdsBySeller(this.state.address);
    const listings = await Promise.all(
      ids.map((id) => this.marketplaceReadOnly.getListing(id)),
    );
    return (listings as Array<{
      listingId: bigint;
      seller: string;
      tokenContract: string;
      tokenType: number;
      tokenId: bigint;
      amount: bigint;
      priceWei: bigint;
      active: boolean;
    }>)
      .filter((l) => l.active)
      .map((l) => ({
        listingId: l.listingId.toString(),
        seller: l.seller,
        tokenContract: l.tokenContract,
        tokenType: l.tokenType === 0 ? ("ERC1155" as const) : ("ERC721" as const),
        tokenId: l.tokenId.toString(),
        amount: l.amount.toString(),
        priceWei: l.priceWei.toString(),
        priceEth: ethers.formatEther(l.priceWei),
        active: l.active,
      }));
  }
}
