// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControlUpgradeable} from
    "../lib/openzeppelin-contracts-upgradeable/contracts/access/AccessControlUpgradeable.sol";
import {PausableUpgradeable} from
    "../lib/openzeppelin-contracts-upgradeable/contracts/utils/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from
    "../lib/openzeppelin-contracts-upgradeable/contracts/utils/ReentrancyGuardUpgradeable.sol";
import {UUPSUpgradeable} from
    "../lib/openzeppelin-contracts-upgradeable/contracts/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from
    "../lib/openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol";
import {IERC1155} from "../lib/openzeppelin-contracts/contracts/token/ERC1155/IERC1155.sol";
import {IERC721} from "../lib/openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";
import {IERC2981} from "../lib/openzeppelin-contracts/contracts/interfaces/IERC2981.sol";
import {IERC165} from "../lib/openzeppelin-contracts/contracts/utils/introspection/IERC165.sol";
import {IERC1155Receiver} from
    "../lib/openzeppelin-contracts/contracts/token/ERC1155/IERC1155Receiver.sol";
import {IERC721Receiver} from
    "../lib/openzeppelin-contracts/contracts/token/ERC721/IERC721Receiver.sol";

/// @title PixelRealmMarketplace
/// @notice On-chain peer-to-peer marketplace for Pixel Realm NFTs.
///         Supports ERC-1155 item listings and ERC-721 land listings.
///         Prices are denominated in ETH (wei).
///         On each sale: ERC-2981 royalty is paid to the token's royalty recipient,
///         a 2.5% platform fee goes to the treasury, remainder goes to the seller.
///         Tokens are held in escrow by this contract until sold or cancelled.
///         Upgradeable via UUPS; upgrade gate guarded by UPGRADER_ROLE.
contract PixelRealmMarketplace is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    IERC1155Receiver,
    IERC721Receiver
{
    // ────────────────────────────────────────────────────────────────────────────
    // Roles
    // ────────────────────────────────────────────────────────────────────────────

    /// @notice Granted to the Gnosis Safe 3-of-5 multisig that authorises contract upgrades.
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // ────────────────────────────────────────────────────────────────────────────
    // Constants
    // ────────────────────────────────────────────────────────────────────────────

    /// @dev Platform fee in basis points (2.5% = 250 bps out of 10_000).
    uint96 public constant PLATFORM_FEE_BPS = 250;

    /// @dev Basis-point denominator.
    uint96 public constant BPS_DENOMINATOR = 10_000;

    // ────────────────────────────────────────────────────────────────────────────
    // Types
    // ────────────────────────────────────────────────────────────────────────────

    enum TokenType {
        ERC1155,
        ERC721
    }

    struct Listing {
        uint256 listingId;
        address seller;
        address tokenContract;
        TokenType tokenType;
        uint256 tokenId;
        uint256 amount;     // always 1 for ERC-721
        uint256 priceWei;
        bool active;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Storage
    // ────────────────────────────────────────────────────────────────────────────

    /// @dev Studio treasury address — receives platform fees.
    address public treasury;

    /// @dev Auto-incrementing listing counter.
    uint256 private _nextListingId;

    /// @dev All listings by ID.
    mapping(uint256 => Listing) private _listings;

    /// @dev Active listing IDs by seller address (for "my listings" query).
    mapping(address => uint256[]) private _listingsBySeller;

    /// @dev Total count of listings ever created (for off-chain pagination).
    uint256 public totalListings;

    // ────────────────────────────────────────────────────────────────────────────
    // Events
    // ────────────────────────────────────────────────────────────────────────────

    event ItemListed(
        uint256 indexed listingId,
        address indexed seller,
        address indexed tokenContract,
        TokenType tokenType,
        uint256 tokenId,
        uint256 amount,
        uint256 priceWei
    );

    event ItemSold(
        uint256 indexed listingId,
        address indexed buyer,
        address indexed seller,
        uint256 priceWei,
        uint256 royaltyPaid,
        uint256 platformFeePaid,
        uint256 sellerProceeds
    );

    event ListingCancelled(uint256 indexed listingId, address indexed seller);

    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    // ────────────────────────────────────────────────────────────────────────────
    // Errors
    // ────────────────────────────────────────────────────────────────────────────

    error ListingNotActive(uint256 listingId);
    error NotSeller(uint256 listingId);
    error SelfPurchase();
    error InsufficientPayment(uint256 required, uint256 sent);
    error ZeroPrice();
    error ZeroAmount();
    error ZeroAddress();
    error ETHTransferFailed(address recipient, uint256 amount);

    // ────────────────────────────────────────────────────────────────────────────
    // Initializer
    // ────────────────────────────────────────────────────────────────────────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @param _treasury   Studio treasury address for platform fees.
    /// @param admin       DEFAULT_ADMIN_ROLE — manages treasury address and pausing.
    /// @param upgrader    UPGRADER_ROLE — Gnosis Safe multisig for UUPS upgrades.
    function initialize(address _treasury, address admin, address upgrader)
        external
        initializer
    {
        if (_treasury == address(0)) revert ZeroAddress();
        if (admin == address(0)) revert ZeroAddress();
        if (upgrader == address(0)) revert ZeroAddress();

        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        treasury = _treasury;
        _nextListingId = 1;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, upgrader);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Listing creation
    // ────────────────────────────────────────────────────────────────────────────

    /// @notice List an ERC-1155 item for sale.
    /// @dev    Caller must have called `setApprovalForAll(marketplace, true)` on the token contract.
    ///         Tokens are transferred into escrow immediately.
    /// @param tokenContract  Address of the ERC-1155 contract.
    /// @param tokenId        Token type ID.
    /// @param amount         Number of tokens to list.
    /// @param priceWei       Total price in wei for the entire lot.
    /// @return listingId     The new listing's ID.
    function listERC1155(
        address tokenContract,
        uint256 tokenId,
        uint256 amount,
        uint256 priceWei
    ) external whenNotPaused returns (uint256 listingId) {
        if (amount == 0) revert ZeroAmount();
        if (priceWei == 0) revert ZeroPrice();
        if (tokenContract == address(0)) revert ZeroAddress();

        listingId = _nextListingId++;
        _listings[listingId] = Listing({
            listingId: listingId,
            seller: msg.sender,
            tokenContract: tokenContract,
            tokenType: TokenType.ERC1155,
            tokenId: tokenId,
            amount: amount,
            priceWei: priceWei,
            active: true
        });
        _listingsBySeller[msg.sender].push(listingId);
        totalListings++;

        // Transfer tokens into escrow (will revert if not approved)
        IERC1155(tokenContract).safeTransferFrom(msg.sender, address(this), tokenId, amount, "");

        emit ItemListed(listingId, msg.sender, tokenContract, TokenType.ERC1155, tokenId, amount, priceWei);
    }

    /// @notice List an ERC-721 token (land parcel) for sale.
    /// @dev    Caller must have called `approve(marketplace, tokenId)` or `setApprovalForAll`
    ///         on the token contract. Token is transferred into escrow immediately.
    /// @param tokenContract  Address of the ERC-721 contract.
    /// @param tokenId        Token ID.
    /// @param priceWei       Price in wei.
    /// @return listingId     The new listing's ID.
    function listERC721(
        address tokenContract,
        uint256 tokenId,
        uint256 priceWei
    ) external whenNotPaused returns (uint256 listingId) {
        if (priceWei == 0) revert ZeroPrice();
        if (tokenContract == address(0)) revert ZeroAddress();

        listingId = _nextListingId++;
        _listings[listingId] = Listing({
            listingId: listingId,
            seller: msg.sender,
            tokenContract: tokenContract,
            tokenType: TokenType.ERC721,
            tokenId: tokenId,
            amount: 1,
            priceWei: priceWei,
            active: true
        });
        _listingsBySeller[msg.sender].push(listingId);
        totalListings++;

        // Transfer NFT into escrow (will revert if not approved or not owner)
        IERC721(tokenContract).transferFrom(msg.sender, address(this), tokenId);

        emit ItemListed(listingId, msg.sender, tokenContract, TokenType.ERC721, tokenId, 1, priceWei);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Purchase
    // ────────────────────────────────────────────────────────────────────────────

    /// @notice Purchase a listed item by sending exactly the listed price in ETH.
    /// @dev    Distributes proceeds: royalty → royalty recipient, platform fee → treasury,
    ///         remainder → seller. Transfers escrowed token to buyer.
    /// @param listingId  The listing to purchase.
    function buyItem(uint256 listingId) external payable whenNotPaused nonReentrant {
        Listing storage listing = _listings[listingId];
        if (!listing.active) revert ListingNotActive(listingId);
        if (listing.seller == msg.sender) revert SelfPurchase();
        if (msg.value < listing.priceWei) {
            revert InsufficientPayment(listing.priceWei, msg.value);
        }

        // Mark inactive before external calls (reentrancy guard + checks-effects-interactions)
        listing.active = false;

        uint256 price = listing.priceWei;
        address seller = listing.seller;

        // ── Royalty ──────────────────────────────────────────────────────────────
        uint256 royaltyAmount = 0;
        address royaltyRecipient = address(0);
        if (IERC165(listing.tokenContract).supportsInterface(type(IERC2981).interfaceId)) {
            (royaltyRecipient, royaltyAmount) = IERC2981(listing.tokenContract).royaltyInfo(
                listing.tokenId, price
            );
        }

        // ── Platform fee ─────────────────────────────────────────────────────────
        uint256 platformFee = (price * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;

        // ── Seller proceeds ──────────────────────────────────────────────────────
        uint256 sellerProceeds = price - royaltyAmount - platformFee;

        // ── Transfer token to buyer ──────────────────────────────────────────────
        if (listing.tokenType == TokenType.ERC1155) {
            IERC1155(listing.tokenContract).safeTransferFrom(
                address(this), msg.sender, listing.tokenId, listing.amount, ""
            );
        } else {
            IERC721(listing.tokenContract).transferFrom(
                address(this), msg.sender, listing.tokenId
            );
        }

        // ── Distribute ETH ───────────────────────────────────────────────────────
        if (royaltyAmount > 0 && royaltyRecipient != address(0)) {
            _safeTransferETH(royaltyRecipient, royaltyAmount);
        }
        _safeTransferETH(treasury, platformFee);
        _safeTransferETH(seller, sellerProceeds);

        // Refund any overpayment
        uint256 overpayment = msg.value - price;
        if (overpayment > 0) {
            _safeTransferETH(msg.sender, overpayment);
        }

        emit ItemSold(listingId, msg.sender, seller, price, royaltyAmount, platformFee, sellerProceeds);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Cancellation
    // ────────────────────────────────────────────────────────────────────────────

    /// @notice Cancel an active listing and reclaim the escrowed token.
    /// @param listingId  The listing to cancel.
    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = _listings[listingId];
        if (!listing.active) revert ListingNotActive(listingId);
        if (listing.seller != msg.sender) revert NotSeller(listingId);

        listing.active = false;

        // Return escrowed token to seller
        if (listing.tokenType == TokenType.ERC1155) {
            IERC1155(listing.tokenContract).safeTransferFrom(
                address(this), msg.sender, listing.tokenId, listing.amount, ""
            );
        } else {
            IERC721(listing.tokenContract).transferFrom(
                address(this), msg.sender, listing.tokenId
            );
        }

        emit ListingCancelled(listingId, msg.sender);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Views
    // ────────────────────────────────────────────────────────────────────────────

    /// @notice Get a single listing by ID.
    function getListing(uint256 listingId) external view returns (Listing memory) {
        return _listings[listingId];
    }

    /// @notice Get all listing IDs created by a given seller.
    ///         Includes inactive listings — callers should filter by `active` field.
    function getListingIdsBySeller(address seller) external view returns (uint256[] memory) {
        return _listingsBySeller[seller];
    }

    /// @notice Retrieve a paginated batch of listings (by raw listing ID range).
    /// @param fromId  First listing ID to include (1-based).
    /// @param count   Maximum number of listings to return.
    /// @return batch  Array of Listing structs (may include inactive ones).
    function getListings(uint256 fromId, uint256 count)
        external
        view
        returns (Listing[] memory batch)
    {
        uint256 end = fromId + count;
        if (end > _nextListingId) end = _nextListingId;
        uint256 len = end > fromId ? end - fromId : 0;
        batch = new Listing[](len);
        for (uint256 i = 0; i < len; i++) {
            batch[i] = _listings[fromId + i];
        }
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Admin
    // ────────────────────────────────────────────────────────────────────────────

    /// @notice Update the studio treasury address.
    function setTreasury(address newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newTreasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    /// @notice Pause the marketplace (disables listings and purchases; cancellations still work).
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /// @notice Unpause the marketplace.
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ────────────────────────────────────────────────────────────────────────────
    // ERC-1155 / ERC-721 receiver hooks (required to hold tokens in escrow)
    // ────────────────────────────────────────────────────────────────────────────

    function onERC1155Received(address, address, uint256, uint256, bytes calldata)
        external
        pure
        override
        returns (bytes4)
    {
        return IERC1155Receiver.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata)
        external
        pure
        override
        returns (bytes4)
    {
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    function onERC721Received(address, address, uint256, bytes calldata)
        external
        pure
        override
        returns (bytes4)
    {
        return IERC721Receiver.onERC721Received.selector;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // UUPS upgrade gate
    // ────────────────────────────────────────────────────────────────────────────

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}

    // ────────────────────────────────────────────────────────────────────────────
    // ERC-165
    // ────────────────────────────────────────────────────────────────────────────

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControlUpgradeable, IERC165)
        returns (bool)
    {
        return interfaceId == type(IERC1155Receiver).interfaceId
            || interfaceId == type(IERC721Receiver).interfaceId
            || super.supportsInterface(interfaceId);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Internal helpers
    // ────────────────────────────────────────────────────────────────────────────

    function _safeTransferETH(address to, uint256 amount) internal {
        (bool success,) = to.call{value: amount}("");
        if (!success) revert ETHTransferFailed(to, amount);
    }
}
