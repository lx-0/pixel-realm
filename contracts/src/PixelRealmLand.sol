// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721EnumerableUpgradeable} from
    "../lib/openzeppelin-contracts-upgradeable/contracts/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import {AccessControlUpgradeable} from
    "../lib/openzeppelin-contracts-upgradeable/contracts/access/AccessControlUpgradeable.sol";
import {ERC2981Upgradeable} from
    "../lib/openzeppelin-contracts-upgradeable/contracts/token/common/ERC2981Upgradeable.sol";
import {UUPSUpgradeable} from
    "../lib/openzeppelin-contracts-upgradeable/contracts/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from
    "../lib/openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol";
import {Strings} from "../lib/openzeppelin-contracts/contracts/utils/Strings.sol";

/// @title PixelRealmLand
/// @notice ERC-721 contract for Pixel Realm land plots.
///         Each NFT represents a unique land plot in a zone.
///         Token IDs are deterministic: keccak256(abi.encodePacked(zoneId, plotIndex)).
///         Royalties: 5% to studio treasury (ERC-2981).
///         Upgradeable via UUPS; upgrade gate guarded by UPGRADER_ROLE (Gnosis Safe 3-of-5).
contract PixelRealmLand is
    Initializable,
    ERC721EnumerableUpgradeable,
    AccessControlUpgradeable,
    ERC2981Upgradeable,
    UUPSUpgradeable
{
    using Strings for uint256;

    // ────────────────────────────────────────────────────────────────────────────
    // Roles
    // ────────────────────────────────────────────────────────────────────────────

    /// @notice Granted to the server-operator key that mints land plots.
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @notice Granted to the Gnosis Safe 3-of-5 multisig that authorises contract upgrades.
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // ────────────────────────────────────────────────────────────────────────────
    // Storage
    // ────────────────────────────────────────────────────────────────────────────

    /// @dev Base URI for token metadata (IPFS directory CID).
    string private _baseTokenURI;

    /// @dev Per-token metadata URI override (optional; set after Pinata upload).
    mapping(uint256 => string) private _tokenURIs;

    /// @dev Zone identifier for each token.
    mapping(uint256 => string) public tokenZone;

    /// @dev Plot index within the zone for each token.
    mapping(uint256 => uint256) public tokenPlotIndex;

    // ────────────────────────────────────────────────────────────────────────────
    // Events
    // ────────────────────────────────────────────────────────────────────────────

    event LandMinted(
        address indexed to, uint256 indexed tokenId, string zoneId, uint256 plotIndex
    );
    event LandBurned(uint256 indexed tokenId);

    // ────────────────────────────────────────────────────────────────────────────
    // Errors
    // ────────────────────────────────────────────────────────────────────────────

    error TokenAlreadyMinted(uint256 tokenId);
    error TokenDoesNotExist(uint256 tokenId);
    error CallerNotOwnerNorApproved();

    // ────────────────────────────────────────────────────────────────────────────
    // Initializer
    // ────────────────────────────────────────────────────────────────────────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @param baseUri   IPFS base URI (e.g. "ipfs://QmXxx/")
    /// @param treasury  Studio treasury address for ERC-2981 royalties
    /// @param admin     Admin (DEFAULT_ADMIN_ROLE) — owns role management
    /// @param minter    Initial MINTER_ROLE holder (server operator key)
    /// @param upgrader  Initial UPGRADER_ROLE holder (Gnosis Safe multisig)
    function initialize(
        string memory baseUri,
        address treasury,
        address admin,
        address minter,
        address upgrader
    ) external initializer {
        require(treasury != address(0), "PixelRealmLand: zero treasury");
        require(admin != address(0), "PixelRealmLand: zero admin");
        require(minter != address(0), "PixelRealmLand: zero minter");
        require(upgrader != address(0), "PixelRealmLand: zero upgrader");

        __ERC721_init("Pixel Realm Land", "PRLAND");
        __ERC721Enumerable_init();
        __AccessControl_init();
        __ERC2981_init();
        __UUPSUpgradeable_init();

        _baseTokenURI = baseUri;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, minter);
        _grantRole(UPGRADER_ROLE, upgrader);

        // 5% royalties (500 basis points) to studio treasury
        _setDefaultRoyalty(treasury, 500);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Token ID derivation
    // ────────────────────────────────────────────────────────────────────────────

    /// @notice Compute the deterministic token ID for a land plot.
    /// @dev    ID = uint256(keccak256(abi.encodePacked(zoneId, plotIndex)))
    ///         This is stable and reproducible — the same inputs always yield the same token ID.
    function getTokenId(string memory zoneId, uint256 plotIndex)
        public
        pure
        returns (uint256)
    {
        return uint256(keccak256(abi.encodePacked(zoneId, plotIndex)));
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Minting & burning
    // ────────────────────────────────────────────────────────────────────────────

    /// @notice Mint a land plot NFT.
    /// @param to         Recipient address.
    /// @param plotTokenId  The token ID.  Must match keccak256(zoneId + plotIndex).
    /// @param zoneId     Zone identifier string (e.g. "forest_01").
    /// @param plotIndex  Plot index within the zone (0-based).
    function mint(
        address to,
        uint256 plotTokenId,
        string calldata zoneId,
        uint256 plotIndex
    ) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "PixelRealmLand: mint to zero address");

        // Verify the caller-supplied plotTokenId matches our deterministic derivation.
        uint256 expectedId = getTokenId(zoneId, plotIndex);
        require(plotTokenId == expectedId, "PixelRealmLand: tokenId mismatch");

        if (_ownerOf(plotTokenId) != address(0)) {
            revert TokenAlreadyMinted(plotTokenId);
        }

        tokenZone[plotTokenId] = zoneId;
        tokenPlotIndex[plotTokenId] = plotIndex;

        _safeMint(to, plotTokenId);
        emit LandMinted(to, plotTokenId, zoneId, plotIndex);
    }

    /// @notice Burn a land plot NFT.
    ///         Caller must be the token owner or approved.
    function burn(uint256 tokenId) external {
        address owner = _ownerOf(tokenId);
        if (owner == address(0)) revert TokenDoesNotExist(tokenId);
        if (
            owner != msg.sender
                && getApproved(tokenId) != msg.sender
                && !isApprovedForAll(owner, msg.sender)
        ) {
            revert CallerNotOwnerNorApproved();
        }
        _burn(tokenId);
        emit LandBurned(tokenId);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Metadata
    // ────────────────────────────────────────────────────────────────────────────

    /// @notice Set the contract-level base URI.
    function setBaseURI(string calldata baseUri) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseTokenURI = baseUri;
    }

    /// @notice Set an individual token's URI override (post-upload to Pinata).
    function setTokenURI(uint256 tokenId, string calldata tokenUri)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (_ownerOf(tokenId) == address(0)) revert TokenDoesNotExist(tokenId);
        _tokenURIs[tokenId] = tokenUri;
    }

    /// @notice Returns the metadata URI for `tokenId`.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) revert TokenDoesNotExist(tokenId);
        string memory perToken = _tokenURIs[tokenId];
        if (bytes(perToken).length > 0) return perToken;
        string memory base = _baseTokenURI;
        if (bytes(base).length == 0) return "";
        return string(abi.encodePacked(base, tokenId.toHexString()));
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Royalty management
    // ────────────────────────────────────────────────────────────────────────────

    /// @notice Update the default royalty recipient and fee.
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

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}

    // ────────────────────────────────────────────────────────────────────────────
    // Internal overrides required by Solidity inheritance
    // ────────────────────────────────────────────────────────────────────────────

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721EnumerableUpgradeable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 amount)
        internal
        override(ERC721EnumerableUpgradeable)
    {
        super._increaseBalance(account, amount);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // ERC-165
    // ────────────────────────────────────────────────────────────────────────────

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721EnumerableUpgradeable, AccessControlUpgradeable, ERC2981Upgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
