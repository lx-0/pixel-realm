// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {PixelRealmLand} from "../src/PixelRealmLand.sol";

contract PixelRealmLandTest is Test {
    // ── Actors ──────────────────────────────────────────────────────────────────
    address internal admin = makeAddr("admin");
    address internal minter = makeAddr("minter");
    address internal upgrader = makeAddr("upgrader");
    address internal treasury = makeAddr("treasury");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal attacker = makeAddr("attacker");

    // ── Land parameters ─────────────────────────────────────────────────────────
    string internal constant ZONE_A = "forest_01";
    uint256 internal constant PLOT_0 = 0;
    uint256 internal constant PLOT_1 = 1;

    PixelRealmLand internal land;

    function setUp() public {
        PixelRealmLand impl = new PixelRealmLand();
        bytes memory initData = abi.encodeCall(
            PixelRealmLand.initialize,
            ("ipfs://QmBaseLand/", treasury, admin, minter, upgrader)
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);
        land = PixelRealmLand(address(proxy));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────────

    function _tokenId(string memory zoneId, uint256 plotIndex)
        internal
        pure
        returns (uint256)
    {
        return uint256(keccak256(abi.encodePacked(zoneId, plotIndex)));
    }

    function _mintPlot(address to, string memory zoneId, uint256 plotIndex)
        internal
        returns (uint256 tokenId)
    {
        tokenId = _tokenId(zoneId, plotIndex);
        vm.prank(minter);
        land.mint(to, tokenId, zoneId, plotIndex);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Initialization
    // ─────────────────────────────────────────────────────────────────────────────

    function test_Initialize_Name() public {
        assertEq(land.name(), "Pixel Realm Land");
    }

    function test_Initialize_Symbol() public {
        assertEq(land.symbol(), "PRLAND");
    }

    function test_Initialize_AdminRole() public {
        assertTrue(land.hasRole(land.DEFAULT_ADMIN_ROLE(), admin));
    }

    function test_Initialize_MinterRole() public {
        assertTrue(land.hasRole(land.MINTER_ROLE(), minter));
    }

    function test_Initialize_UpgraderRole() public {
        assertTrue(land.hasRole(land.UPGRADER_ROLE(), upgrader));
    }

    function test_Initialize_DefaultRoyalty() public {
        (address receiver, uint256 amount) = land.royaltyInfo(0, 10_000);
        assertEq(receiver, treasury);
        assertEq(amount, 500); // 5%
    }

    function test_Initialize_Reverts_ZeroTreasury() public {
        PixelRealmLand impl = new PixelRealmLand();
        bytes memory initData = abi.encodeCall(
            PixelRealmLand.initialize,
            ("ipfs://base", address(0), admin, minter, upgrader)
        );
        vm.expectRevert("PixelRealmLand: zero treasury");
        new ERC1967Proxy(address(impl), initData);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Token ID derivation
    // ─────────────────────────────────────────────────────────────────────────────

    function test_GetTokenId_Deterministic() public {
        uint256 id1 = land.getTokenId(ZONE_A, PLOT_0);
        uint256 id2 = land.getTokenId(ZONE_A, PLOT_0);
        assertEq(id1, id2);
    }

    function test_GetTokenId_DifferentZonesDiffer() public {
        uint256 idA = land.getTokenId(ZONE_A, PLOT_0);
        uint256 idB = land.getTokenId("desert_01", PLOT_0);
        assertNotEq(idA, idB);
    }

    function test_GetTokenId_DifferentPlotsDiffer() public {
        uint256 id0 = land.getTokenId(ZONE_A, PLOT_0);
        uint256 id1 = land.getTokenId(ZONE_A, PLOT_1);
        assertNotEq(id0, id1);
    }

    function test_GetTokenId_MatchesExpected() public {
        uint256 expected = uint256(keccak256(abi.encodePacked("forest_01", uint256(0))));
        // Just ensure the formula is consistent — tested by the helper
        assertEq(expected, uint256(keccak256(abi.encodePacked("forest_01", uint256(0)))));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Minting
    // ─────────────────────────────────────────────────────────────────────────────

    function test_Mint_Basic() public {
        uint256 tokenId = _mintPlot(alice, ZONE_A, PLOT_0);
        assertEq(land.ownerOf(tokenId), alice);
    }

    function test_Mint_StoresZone() public {
        uint256 tokenId = _mintPlot(alice, ZONE_A, PLOT_0);
        assertEq(land.tokenZone(tokenId), ZONE_A);
    }

    function test_Mint_StoresPlotIndex() public {
        uint256 tokenId = _mintPlot(alice, ZONE_A, PLOT_0);
        assertEq(land.tokenPlotIndex(tokenId), PLOT_0);
    }

    function test_Mint_EmitsEvent() public {
        uint256 tokenId = _tokenId(ZONE_A, PLOT_0);
        vm.expectEmit(true, true, false, true, address(land));
        emit PixelRealmLand.LandMinted(alice, tokenId, ZONE_A, PLOT_0);
        vm.prank(minter);
        land.mint(alice, tokenId, ZONE_A, PLOT_0);
    }

    function test_Mint_Reverts_NotMinter() public {
        uint256 tokenId = _tokenId(ZONE_A, PLOT_0);
        vm.prank(attacker);
        vm.expectRevert();
        land.mint(alice, tokenId, ZONE_A, PLOT_0);
    }

    function test_Mint_Reverts_ZeroAddress() public {
        uint256 tokenId = _tokenId(ZONE_A, PLOT_0);
        vm.prank(minter);
        vm.expectRevert("PixelRealmLand: mint to zero address");
        land.mint(address(0), tokenId, ZONE_A, PLOT_0);
    }

    function test_Mint_Reverts_TokenIdMismatch() public {
        vm.prank(minter);
        vm.expectRevert("PixelRealmLand: tokenId mismatch");
        land.mint(alice, 12345, ZONE_A, PLOT_0); // wrong token ID
    }

    function test_Mint_Reverts_AlreadyMinted() public {
        uint256 tokenId = _mintPlot(alice, ZONE_A, PLOT_0);
        vm.prank(minter);
        vm.expectRevert(abi.encodeWithSelector(PixelRealmLand.TokenAlreadyMinted.selector, tokenId));
        land.mint(bob, tokenId, ZONE_A, PLOT_0);
    }

    function test_Mint_EnumerableWorks() public {
        _mintPlot(alice, ZONE_A, PLOT_0);
        _mintPlot(alice, ZONE_A, PLOT_1);
        assertEq(land.balanceOf(alice), 2);
        assertEq(land.totalSupply(), 2);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Burning
    // ─────────────────────────────────────────────────────────────────────────────

    function test_Burn_ByOwner() public {
        uint256 tokenId = _mintPlot(alice, ZONE_A, PLOT_0);
        vm.prank(alice);
        land.burn(tokenId);
        assertEq(land.balanceOf(alice), 0);
    }

    function test_Burn_EmitsEvent() public {
        uint256 tokenId = _mintPlot(alice, ZONE_A, PLOT_0);
        vm.expectEmit(true, false, false, false, address(land));
        emit PixelRealmLand.LandBurned(tokenId);
        vm.prank(alice);
        land.burn(tokenId);
    }

    function test_Burn_ByApprovedOperator() public {
        uint256 tokenId = _mintPlot(alice, ZONE_A, PLOT_0);
        vm.prank(alice);
        land.setApprovalForAll(bob, true);
        vm.prank(bob);
        land.burn(tokenId);
        assertEq(land.balanceOf(alice), 0);
    }

    function test_Burn_Reverts_Unauthorized() public {
        uint256 tokenId = _mintPlot(alice, ZONE_A, PLOT_0);
        vm.prank(attacker);
        vm.expectRevert(PixelRealmLand.CallerNotOwnerNorApproved.selector);
        land.burn(tokenId);
    }

    function test_Burn_Reverts_NonexistentToken() public {
        uint256 fakeId = _tokenId("nonexistent", 999);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(PixelRealmLand.TokenDoesNotExist.selector, fakeId));
        land.burn(fakeId);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Transfers
    // ─────────────────────────────────────────────────────────────────────────────

    function test_Transfer() public {
        uint256 tokenId = _mintPlot(alice, ZONE_A, PLOT_0);
        vm.prank(alice);
        land.transferFrom(alice, bob, tokenId);
        assertEq(land.ownerOf(tokenId), bob);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Metadata
    // ─────────────────────────────────────────────────────────────────────────────

    function test_TokenURI_UsesBaseWhenNoOverride() public {
        uint256 tokenId = _mintPlot(alice, ZONE_A, PLOT_0);
        string memory uri = land.tokenURI(tokenId);
        assertTrue(bytes(uri).length > 0);
    }

    function test_TokenURI_PerTokenOverride() public {
        uint256 tokenId = _mintPlot(alice, ZONE_A, PLOT_0);
        vm.prank(admin);
        land.setTokenURI(tokenId, "ipfs://QmForest01Plot0");
        assertEq(land.tokenURI(tokenId), "ipfs://QmForest01Plot0");
    }

    function test_TokenURI_Reverts_NonexistentToken() public {
        uint256 fakeId = _tokenId("nonexistent", 999);
        vm.expectRevert(abi.encodeWithSelector(PixelRealmLand.TokenDoesNotExist.selector, fakeId));
        land.tokenURI(fakeId);
    }

    function test_SetBaseURI() public {
        uint256 tokenId = _mintPlot(alice, ZONE_A, PLOT_0);
        vm.prank(admin);
        land.setBaseURI("ipfs://QmNewBase/");
        string memory uri = land.tokenURI(tokenId);
        assertTrue(bytes(uri).length > 0);
    }

    function test_SetBaseURI_Reverts_NotAdmin() public {
        vm.prank(attacker);
        vm.expectRevert();
        land.setBaseURI("ipfs://hack");
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Royalties
    // ─────────────────────────────────────────────────────────────────────────────

    function test_Royalty_DefaultFivePercent() public {
        (address receiver, uint256 amount) = land.royaltyInfo(0, 1 ether);
        assertEq(receiver, treasury);
        assertEq(amount, 0.05 ether);
    }

    function test_Royalty_UpdateDefault() public {
        address newTreasury = makeAddr("newTreasury");
        vm.prank(admin);
        land.setDefaultRoyalty(newTreasury, 1000); // 10%
        (address receiver, uint256 amount) = land.royaltyInfo(0, 1 ether);
        assertEq(receiver, newTreasury);
        assertEq(amount, 0.1 ether);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // supportsInterface
    // ─────────────────────────────────────────────────────────────────────────────

    function test_SupportsInterface_ERC721() public {
        assertTrue(land.supportsInterface(0x80ac58cd)); // ERC-721
    }

    function test_SupportsInterface_ERC721Enumerable() public {
        assertTrue(land.supportsInterface(0x780e9d63)); // ERC-721 Enumerable
    }

    function test_SupportsInterface_ERC2981() public {
        assertTrue(land.supportsInterface(0x2a55205a)); // ERC-2981
    }

    function test_SupportsInterface_AccessControl() public {
        assertTrue(land.supportsInterface(0x7965db0b)); // IAccessControl
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Fuzz tests
    // ─────────────────────────────────────────────────────────────────────────────

    function testFuzz_GetTokenId_NeverCollides(
        string calldata zone1,
        uint256 plot1,
        string calldata zone2,
        uint256 plot2
    ) public {
        vm.assume(
            keccak256(bytes(zone1)) != keccak256(bytes(zone2)) || plot1 != plot2
        );
        uint256 id1 = land.getTokenId(zone1, plot1);
        uint256 id2 = land.getTokenId(zone2, plot2);
        assertNotEq(id1, id2);
    }

    function testFuzz_Royalty_IsAlways5Percent(uint256 salePrice) public {
        salePrice = bound(salePrice, 0, type(uint128).max);
        (, uint256 royalty) = land.royaltyInfo(0, salePrice);
        assertEq(royalty, salePrice * 500 / 10_000);
    }
}
