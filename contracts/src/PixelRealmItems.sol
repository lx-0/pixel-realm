// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155Upgradeable} from
    "../lib/openzeppelin-contracts-upgradeable/contracts/token/ERC1155/ERC1155Upgradeable.sol";
import {AccessControlUpgradeable} from
    "../lib/openzeppelin-contracts-upgradeable/contracts/access/AccessControlUpgradeable.sol";
import {ERC2981Upgradeable} from
    "../lib/openzeppelin-contracts-upgradeable/contracts/token/common/ERC2981Upgradeable.sol";
import {UUPSUpgradeable} from
    "../lib/openzeppelin-contracts-upgradeable/contracts/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from
    "../lib/openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol";

/// @title PixelRealmItems
/// @notice ERC-1155 multi-token contract for Pixel Realm in-game items.
///         Each token ID represents an item type. Amounts represent item quantities.
///         Royalties: 5% to studio treasury (ERC-2981).
///         Upgradeable via UUPS; upgrade gate guarded by UPGRADER_ROLE (Gnosis Safe 3-of-5).
contract PixelRealmItems is
    Initializable,
    ERC1155Upgradeable,
    AccessControlUpgradeable,
    ERC2981Upgradeable,
    UUPSUpgradeable
{
    // ────────────────────────────────────────────────────────────────────────────
    // Roles
    // ────────────────────────────────────────────────────────────────────────────

    /// @notice Granted to the server-operator key that mints items on gameplay events.
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @notice Granted to the Gnosis Safe 3-of-5 multisig that authorises contract upgrades.
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // ────────────────────────────────────────────────────────────────────────────
    // Storage
    // ────────────────────────────────────────────────────────────────────────────

    /// @dev Per-item-type IPFS URI override.  Falls back to contract-level URI when empty.
    mapping(uint256 => string) private _tokenURIs;

    /// @dev Name returned for ERC-1155 metadata (OpenSea convention).
    string public name;

    /// @dev Symbol returned for ERC-1155 metadata (OpenSea convention).
    string public symbol;

    // ────────────────────────────────────────────────────────────────────────────
    // Events
    // ────────────────────────────────────────────────────────────────────────────

    event ItemMinted(address indexed to, uint256 indexed itemTypeId, uint256 amount);
    event ItemBurned(address indexed from, uint256 indexed itemTypeId, uint256 amount);
    event ItemURISet(uint256 indexed itemTypeId, string uri);

    // ────────────────────────────────────────────────────────────────────────────
    // Initializer (replaces constructor for upgradeable pattern)
    // ────────────────────────────────────────────────────────────────────────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @param defaultUri   IPFS base URI used when no per-type URI is set
    /// @param treasury     Studio treasury address for ERC-2981 royalties
    /// @param admin        Admin (DEFAULT_ADMIN_ROLE) — owns role management
    /// @param minter       Initial MINTER_ROLE holder (server operator key)
    /// @param upgrader     Initial UPGRADER_ROLE holder (Gnosis Safe multisig)
    function initialize(
        string memory defaultUri,
        address treasury,
        address admin,
        address minter,
        address upgrader
    ) external initializer {
        require(treasury != address(0), "PixelRealmItems: zero treasury");
        require(admin != address(0), "PixelRealmItems: zero admin");
        require(minter != address(0), "PixelRealmItems: zero minter");
        require(upgrader != address(0), "PixelRealmItems: zero upgrader");

        __ERC1155_init(defaultUri);
        __AccessControl_init();
        __ERC2981_init();
        __UUPSUpgradeable_init();

        name = "Pixel Realm Items";
        symbol = "PRITEM";

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, minter);
        _grantRole(UPGRADER_ROLE, upgrader);

        // 5% royalties (500 basis points) to studio treasury
        _setDefaultRoyalty(treasury, 500);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Minting & burning
    // ────────────────────────────────────────────────────────────────────────────

    /// @notice Mint `amount` of item type `itemTypeId` to `to`.
    /// @dev Only callable by MINTER_ROLE (server operator).
    function mint(address to, uint256 itemTypeId, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "PixelRealmItems: mint to zero address");
        require(amount > 0, "PixelRealmItems: mint zero amount");
        _mint(to, itemTypeId, amount, "");
        emit ItemMinted(to, itemTypeId, amount);
    }

    /// @notice Mint a batch of item types in a single transaction.
    function mintBatch(address to, uint256[] calldata itemTypeIds, uint256[] calldata amounts)
        external
        onlyRole(MINTER_ROLE)
    {
        require(to != address(0), "PixelRealmItems: mint to zero address");
        require(itemTypeIds.length == amounts.length, "PixelRealmItems: length mismatch");
        _mintBatch(to, itemTypeIds, amounts, "");
    }

    /// @notice Burn `amount` of `itemTypeId` from `from`.
    ///         Caller must be the token owner or have approval.
    function burn(address from, uint256 itemTypeId, uint256 amount) external {
        require(
            from == msg.sender || isApprovedForAll(from, msg.sender),
            "PixelRealmItems: caller is not owner nor approved"
        );
        _burn(from, itemTypeId, amount);
        emit ItemBurned(from, itemTypeId, amount);
    }

    /// @notice Burn a batch of item types.
    function burnBatch(address from, uint256[] calldata itemTypeIds, uint256[] calldata amounts)
        external
    {
        require(
            from == msg.sender || isApprovedForAll(from, msg.sender),
            "PixelRealmItems: caller is not owner nor approved"
        );
        _burnBatch(from, itemTypeIds, amounts);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // URI management
    // ────────────────────────────────────────────────────────────────────────────

    /// @notice Override the URI for a specific item type (IPFS CID per item type).
    /// @dev Only DEFAULT_ADMIN_ROLE can call this.
    function setTokenURI(uint256 itemTypeId, string calldata tokenUri)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _tokenURIs[itemTypeId] = tokenUri;
        emit ItemURISet(itemTypeId, tokenUri);
        emit URI(tokenUri, itemTypeId);
    }

    /// @notice Update the contract-level base URI.
    function setBaseURI(string calldata newUri) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setURI(newUri);
    }

    /// @inheritdoc ERC1155Upgradeable
    function uri(uint256 itemTypeId) public view override returns (string memory) {
        string memory perType = _tokenURIs[itemTypeId];
        if (bytes(perType).length > 0) {
            return perType;
        }
        return super.uri(itemTypeId);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Royalty management
    // ────────────────────────────────────────────────────────────────────────────

    /// @notice Update the default royalty recipient and fee.
    /// @param receiver  New royalty recipient.
    /// @param feeNumerator  Fee in basis points (e.g. 500 = 5%).
    function setDefaultRoyalty(address receiver, uint96 feeNumerator)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    /// @notice Set per-token royalty override.
    function setTokenRoyalty(uint256 tokenId, address receiver, uint96 feeNumerator)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _setTokenRoyalty(tokenId, receiver, feeNumerator);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // UUPS upgrade gate
    // ────────────────────────────────────────────────────────────────────────────

    /// @inheritdoc UUPSUpgradeable
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}

    // ────────────────────────────────────────────────────────────────────────────
    // ERC-165 supportsInterface
    // ────────────────────────────────────────────────────────────────────────────

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155Upgradeable, AccessControlUpgradeable, ERC2981Upgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
