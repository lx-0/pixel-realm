// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {PixelRealmItems} from "../src/PixelRealmItems.sol";

contract PixelRealmItemsTest is Test {
    // ── Actors ──────────────────────────────────────────────────────────────────
    address internal admin = makeAddr("admin");
    address internal minter = makeAddr("minter");
    address internal upgrader = makeAddr("upgrader");
    address internal treasury = makeAddr("treasury");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal attacker = makeAddr("attacker");

    // ── Item type IDs ────────────────────────────────────────────────────────────
    uint256 internal constant SWORD = 1;
    uint256 internal constant SHIELD = 2;
    uint256 internal constant POTION = 3;

    PixelRealmItems internal items;

    function setUp() public {
        PixelRealmItems impl = new PixelRealmItems();
        bytes memory initData = abi.encodeCall(
            PixelRealmItems.initialize,
            ("ipfs://QmBaseItems/{id}.json", treasury, admin, minter, upgrader)
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);
        items = PixelRealmItems(address(proxy));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Initialization
    // ─────────────────────────────────────────────────────────────────────────────

    function test_Initialize_Name() public {
        assertEq(items.name(), "Pixel Realm Items");
    }

    function test_Initialize_Symbol() public {
        assertEq(items.symbol(), "PRITEM");
    }

    function test_Initialize_AdminRole() public {
        assertTrue(items.hasRole(items.DEFAULT_ADMIN_ROLE(), admin));
    }

    function test_Initialize_MinterRole() public {
        assertTrue(items.hasRole(items.MINTER_ROLE(), minter));
    }

    function test_Initialize_UpgraderRole() public {
        assertTrue(items.hasRole(items.UPGRADER_ROLE(), upgrader));
    }

    function test_Initialize_DefaultRoyalty() public {
        (address receiver, uint256 amount) = items.royaltyInfo(SWORD, 10_000);
        assertEq(receiver, treasury);
        assertEq(amount, 500); // 5% of 10_000
    }

    function test_Initialize_Reverts_ZeroTreasury() public {
        PixelRealmItems impl = new PixelRealmItems();
        bytes memory initData = abi.encodeCall(
            PixelRealmItems.initialize,
            ("ipfs://base", address(0), admin, minter, upgrader)
        );
        vm.expectRevert("PixelRealmItems: zero treasury");
        new ERC1967Proxy(address(impl), initData);
    }

    function test_Initialize_Reverts_ZeroAdmin() public {
        PixelRealmItems impl = new PixelRealmItems();
        bytes memory initData = abi.encodeCall(
            PixelRealmItems.initialize,
            ("ipfs://base", treasury, address(0), minter, upgrader)
        );
        vm.expectRevert("PixelRealmItems: zero admin");
        new ERC1967Proxy(address(impl), initData);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Minting
    // ─────────────────────────────────────────────────────────────────────────────

    function test_Mint_Basic() public {
        vm.prank(minter);
        items.mint(alice, SWORD, 10);
        assertEq(items.balanceOf(alice, SWORD), 10);
    }

    function test_Mint_EmitsEvent() public {
        vm.expectEmit(true, true, false, true, address(items));
        emit PixelRealmItems.ItemMinted(alice, SWORD, 5);
        vm.prank(minter);
        items.mint(alice, SWORD, 5);
    }

    function test_Mint_Reverts_NotMinter() public {
        vm.prank(attacker);
        vm.expectRevert();
        items.mint(alice, SWORD, 1);
    }

    function test_Mint_Reverts_ZeroAddress() public {
        vm.prank(minter);
        vm.expectRevert("PixelRealmItems: mint to zero address");
        items.mint(address(0), SWORD, 1);
    }

    function test_Mint_Reverts_ZeroAmount() public {
        vm.prank(minter);
        vm.expectRevert("PixelRealmItems: mint zero amount");
        items.mint(alice, SWORD, 0);
    }

    function test_MintBatch() public {
        uint256[] memory ids = new uint256[](2);
        uint256[] memory amounts = new uint256[](2);
        ids[0] = SWORD;
        ids[1] = SHIELD;
        amounts[0] = 3;
        amounts[1] = 7;

        vm.prank(minter);
        items.mintBatch(alice, ids, amounts);

        assertEq(items.balanceOf(alice, SWORD), 3);
        assertEq(items.balanceOf(alice, SHIELD), 7);
    }

    function test_MintBatch_Reverts_LengthMismatch() public {
        uint256[] memory ids = new uint256[](2);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = SWORD;
        ids[1] = SHIELD;
        amounts[0] = 3;

        vm.prank(minter);
        vm.expectRevert("PixelRealmItems: length mismatch");
        items.mintBatch(alice, ids, amounts);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Burning
    // ─────────────────────────────────────────────────────────────────────────────

    function test_Burn_ByOwner() public {
        vm.prank(minter);
        items.mint(alice, POTION, 5);

        vm.prank(alice);
        items.burn(alice, POTION, 2);

        assertEq(items.balanceOf(alice, POTION), 3);
    }

    function test_Burn_EmitsEvent() public {
        vm.prank(minter);
        items.mint(alice, POTION, 5);

        vm.expectEmit(true, true, false, true, address(items));
        emit PixelRealmItems.ItemBurned(alice, POTION, 2);

        vm.prank(alice);
        items.burn(alice, POTION, 2);
    }

    function test_Burn_ByApprovedOperator() public {
        vm.prank(minter);
        items.mint(alice, POTION, 5);

        vm.prank(alice);
        items.setApprovalForAll(bob, true);

        vm.prank(bob);
        items.burn(alice, POTION, 3);
        assertEq(items.balanceOf(alice, POTION), 2);
    }

    function test_Burn_Reverts_Unauthorized() public {
        vm.prank(minter);
        items.mint(alice, POTION, 5);

        vm.prank(attacker);
        vm.expectRevert("PixelRealmItems: caller is not owner nor approved");
        items.burn(alice, POTION, 1);
    }

    function test_BurnBatch() public {
        uint256[] memory ids = new uint256[](2);
        uint256[] memory amounts = new uint256[](2);
        ids[0] = SWORD;
        ids[1] = SHIELD;
        amounts[0] = 4;
        amounts[1] = 6;

        vm.prank(minter);
        items.mintBatch(alice, ids, amounts);

        uint256[] memory burnAmounts = new uint256[](2);
        burnAmounts[0] = 1;
        burnAmounts[1] = 2;

        vm.prank(alice);
        items.burnBatch(alice, ids, burnAmounts);

        assertEq(items.balanceOf(alice, SWORD), 3);
        assertEq(items.balanceOf(alice, SHIELD), 4);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Transfers
    // ─────────────────────────────────────────────────────────────────────────────

    function test_Transfer() public {
        vm.prank(minter);
        items.mint(alice, SWORD, 10);

        vm.prank(alice);
        items.safeTransferFrom(alice, bob, SWORD, 3, "");

        assertEq(items.balanceOf(alice, SWORD), 7);
        assertEq(items.balanceOf(bob, SWORD), 3);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // URI
    // ─────────────────────────────────────────────────────────────────────────────

    function test_URI_FallsBackToBase() public {
        // No per-type URI set; should return the base URI pattern
        string memory u = items.uri(SWORD);
        assertEq(u, "ipfs://QmBaseItems/{id}.json");
    }

    function test_URI_PerTypeOverride() public {
        vm.prank(admin);
        items.setTokenURI(SWORD, "ipfs://QmSwordMetadata");

        assertEq(items.uri(SWORD), "ipfs://QmSwordMetadata");
        // Other tokens still use base
        assertEq(items.uri(SHIELD), "ipfs://QmBaseItems/{id}.json");
    }

    function test_URI_Reverts_NotAdmin() public {
        vm.prank(attacker);
        vm.expectRevert();
        items.setTokenURI(SWORD, "ipfs://hack");
    }

    function test_SetBaseURI() public {
        vm.prank(admin);
        items.setBaseURI("ipfs://QmNewBase/{id}.json");
        assertEq(items.uri(SWORD), "ipfs://QmNewBase/{id}.json");
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Royalties
    // ─────────────────────────────────────────────────────────────────────────────

    function test_Royalty_DefaultFivePercent() public {
        (address receiver, uint256 amount) = items.royaltyInfo(SWORD, 1 ether);
        assertEq(receiver, treasury);
        assertEq(amount, 0.05 ether);
    }

    function test_Royalty_UpdateDefault() public {
        address newTreasury = makeAddr("newTreasury");
        vm.prank(admin);
        items.setDefaultRoyalty(newTreasury, 1000); // 10%
        (address receiver, uint256 amount) = items.royaltyInfo(SWORD, 1 ether);
        assertEq(receiver, newTreasury);
        assertEq(amount, 0.1 ether);
    }

    function test_Royalty_UpdateDefault_Reverts_NotAdmin() public {
        vm.prank(attacker);
        vm.expectRevert();
        items.setDefaultRoyalty(attacker, 1000);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // supportsInterface
    // ─────────────────────────────────────────────────────────────────────────────

    function test_SupportsInterface_ERC1155() public {
        assertTrue(items.supportsInterface(0xd9b67a26)); // ERC-1155
    }

    function test_SupportsInterface_ERC2981() public {
        assertTrue(items.supportsInterface(0x2a55205a)); // ERC-2981
    }

    function test_SupportsInterface_AccessControl() public {
        assertTrue(items.supportsInterface(0x7965db0b)); // IAccessControl
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Fuzz tests
    // ─────────────────────────────────────────────────────────────────────────────

    function testFuzz_Mint_AnyAmount(uint256 itemTypeId, uint256 amount) public {
        amount = bound(amount, 1, type(uint128).max);
        vm.prank(minter);
        items.mint(alice, itemTypeId, amount);
        assertEq(items.balanceOf(alice, itemTypeId), amount);
    }

    function testFuzz_Royalty_IsAlways5Percent(uint256 salePrice) public {
        salePrice = bound(salePrice, 0, type(uint128).max);
        (, uint256 royalty) = items.royaltyInfo(SWORD, salePrice);
        assertEq(royalty, salePrice * 500 / 10_000);
    }
}
