// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {PixelRealmMarketplace} from "../src/PixelRealmMarketplace.sol";
import {PixelRealmItems} from "../src/PixelRealmItems.sol";
import {PixelRealmLand} from "../src/PixelRealmLand.sol";

contract PixelRealmMarketplaceTest is Test {
    // ── Actors ──────────────────────────────────────────────────────────────────
    address internal admin     = makeAddr("admin");
    address internal minter    = makeAddr("minter");
    address internal upgrader  = makeAddr("upgrader");
    address internal treasury  = makeAddr("treasury");
    address internal alice     = makeAddr("alice");
    address internal bob       = makeAddr("bob");
    address internal attacker  = makeAddr("attacker");

    // ── Item type IDs ────────────────────────────────────────────────────────────
    uint256 internal constant SWORD  = 1;
    uint256 internal constant POTION = 3;

    // ── Land ─────────────────────────────────────────────────────────────────────
    string internal constant ZONE_ID   = "forest_01";
    uint256 internal constant PLOT_IDX = 0;

    // ── Contracts ────────────────────────────────────────────────────────────────
    PixelRealmMarketplace internal market;
    PixelRealmItems internal items;
    PixelRealmLand internal land;

    function setUp() public {
        // Deploy Items
        PixelRealmItems itemsImpl = new PixelRealmItems();
        bytes memory itemsInit = abi.encodeCall(
            PixelRealmItems.initialize,
            ("ipfs://items/{id}.json", treasury, admin, minter, upgrader)
        );
        items = PixelRealmItems(address(new ERC1967Proxy(address(itemsImpl), itemsInit)));

        // Deploy Land
        PixelRealmLand landImpl = new PixelRealmLand();
        bytes memory landInit = abi.encodeCall(
            PixelRealmLand.initialize,
            ("ipfs://land/", treasury, admin, minter, upgrader)
        );
        land = PixelRealmLand(address(new ERC1967Proxy(address(landImpl), landInit)));

        // Deploy Marketplace
        PixelRealmMarketplace marketImpl = new PixelRealmMarketplace();
        bytes memory marketInit = abi.encodeCall(
            PixelRealmMarketplace.initialize,
            (treasury, admin, upgrader)
        );
        market = PixelRealmMarketplace(address(new ERC1967Proxy(address(marketImpl), marketInit)));

        // Mint test tokens to alice
        vm.prank(minter);
        items.mint(alice, SWORD, 10);

        vm.prank(minter);
        items.mint(alice, POTION, 5);

        uint256 landTokenId = land.getTokenId(ZONE_ID, PLOT_IDX);
        vm.prank(minter);
        land.mint(alice, landTokenId, ZONE_ID, PLOT_IDX);

        // Fund all actors with ETH
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(attacker, 100 ether);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Initialization
    // ─────────────────────────────────────────────────────────────────────────────

    function test_Initialize_Treasury() public {
        assertEq(market.treasury(), treasury);
    }

    function test_Initialize_AdminRole() public {
        assertTrue(market.hasRole(market.DEFAULT_ADMIN_ROLE(), admin));
    }

    function test_Initialize_UpgraderRole() public {
        assertTrue(market.hasRole(market.UPGRADER_ROLE(), upgrader));
    }

    function test_Initialize_Reverts_ZeroTreasury() public {
        PixelRealmMarketplace impl = new PixelRealmMarketplace();
        bytes memory initData = abi.encodeCall(
            PixelRealmMarketplace.initialize,
            (address(0), admin, upgrader)
        );
        vm.expectRevert(PixelRealmMarketplace.ZeroAddress.selector);
        new ERC1967Proxy(address(impl), initData);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ERC-1155 listing
    // ─────────────────────────────────────────────────────────────────────────────

    function test_ListERC1155_Basic() public {
        vm.startPrank(alice);
        items.setApprovalForAll(address(market), true);
        uint256 listingId = market.listERC1155(address(items), SWORD, 3, 1 ether);
        vm.stopPrank();

        assertEq(listingId, 1);
        assertEq(market.totalListings(), 1);

        PixelRealmMarketplace.Listing memory l = market.getListing(1);
        assertEq(l.seller, alice);
        assertEq(l.tokenContract, address(items));
        assertEq(uint8(l.tokenType), uint8(PixelRealmMarketplace.TokenType.ERC1155));
        assertEq(l.tokenId, SWORD);
        assertEq(l.amount, 3);
        assertEq(l.priceWei, 1 ether);
        assertTrue(l.active);
    }

    function test_ListERC1155_TokensEscrowed() public {
        vm.startPrank(alice);
        items.setApprovalForAll(address(market), true);
        market.listERC1155(address(items), SWORD, 3, 1 ether);
        vm.stopPrank();

        assertEq(items.balanceOf(alice, SWORD), 7);           // 10 - 3
        assertEq(items.balanceOf(address(market), SWORD), 3); // held in escrow
    }

    function test_ListERC1155_EmitsEvent() public {
        vm.startPrank(alice);
        items.setApprovalForAll(address(market), true);

        vm.expectEmit(true, true, true, true, address(market));
        emit PixelRealmMarketplace.ItemListed(
            1, alice, address(items), PixelRealmMarketplace.TokenType.ERC1155, SWORD, 3, 1 ether
        );
        market.listERC1155(address(items), SWORD, 3, 1 ether);
        vm.stopPrank();
    }

    function test_ListERC1155_Reverts_ZeroAmount() public {
        vm.startPrank(alice);
        items.setApprovalForAll(address(market), true);
        vm.expectRevert(PixelRealmMarketplace.ZeroAmount.selector);
        market.listERC1155(address(items), SWORD, 0, 1 ether);
        vm.stopPrank();
    }

    function test_ListERC1155_Reverts_ZeroPrice() public {
        vm.startPrank(alice);
        items.setApprovalForAll(address(market), true);
        vm.expectRevert(PixelRealmMarketplace.ZeroPrice.selector);
        market.listERC1155(address(items), SWORD, 1, 0);
        vm.stopPrank();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ERC-721 listing
    // ─────────────────────────────────────────────────────────────────────────────

    function test_ListERC721_Basic() public {
        uint256 landTokenId = land.getTokenId(ZONE_ID, PLOT_IDX);

        vm.startPrank(alice);
        land.approve(address(market), landTokenId);
        uint256 listingId = market.listERC721(address(land), landTokenId, 2 ether);
        vm.stopPrank();

        PixelRealmMarketplace.Listing memory l = market.getListing(listingId);
        assertEq(l.seller, alice);
        assertEq(uint8(l.tokenType), uint8(PixelRealmMarketplace.TokenType.ERC721));
        assertEq(l.tokenId, landTokenId);
        assertEq(l.amount, 1);
        assertEq(l.priceWei, 2 ether);
        assertTrue(l.active);
    }

    function test_ListERC721_TokenEscrowed() public {
        uint256 landTokenId = land.getTokenId(ZONE_ID, PLOT_IDX);

        vm.startPrank(alice);
        land.approve(address(market), landTokenId);
        market.listERC721(address(land), landTokenId, 2 ether);
        vm.stopPrank();

        assertEq(land.ownerOf(landTokenId), address(market));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Buy ERC-1155 item
    // ─────────────────────────────────────────────────────────────────────────────

    function _listSword(uint256 priceWei) internal returns (uint256 listingId) {
        vm.startPrank(alice);
        items.setApprovalForAll(address(market), true);
        listingId = market.listERC1155(address(items), SWORD, 3, priceWei);
        vm.stopPrank();
    }

    function test_BuyERC1155_TokenTransferred() public {
        uint256 listingId = _listSword(1 ether);

        vm.prank(bob);
        market.buyItem{value: 1 ether}(listingId);

        assertEq(items.balanceOf(bob, SWORD), 3);
        assertEq(items.balanceOf(address(market), SWORD), 0);
    }

    function test_BuyERC1155_ListingDeactivated() public {
        uint256 listingId = _listSword(1 ether);
        vm.prank(bob);
        market.buyItem{value: 1 ether}(listingId);

        assertFalse(market.getListing(listingId).active);
    }

    function test_BuyERC1155_RoyaltyAndFeeDistribution() public {
        uint256 price = 1 ether;
        uint256 listingId = _listSword(price);

        uint256 treasuryBefore = treasury.balance;
        uint256 aliceBefore    = alice.balance;

        // Items has 5% royalty → 0.05 ether to treasury (royalty recipient)
        // Platform fee 2.5% → 0.025 ether to treasury
        // Seller gets: 1 - 0.05 - 0.025 = 0.925 ether

        vm.prank(bob);
        market.buyItem{value: price}(listingId);

        uint256 expectedRoyalty  = price * 500 / 10_000;   // 5%
        uint256 expectedPlatform = price * 250 / 10_000;   // 2.5%
        uint256 expectedSeller   = price - expectedRoyalty - expectedPlatform;

        // treasury receives both royalty and platform fee
        assertEq(treasury.balance - treasuryBefore, expectedRoyalty + expectedPlatform);
        assertEq(alice.balance - aliceBefore, expectedSeller);
    }

    function test_BuyERC1155_EmitsEvent() public {
        uint256 price = 1 ether;
        uint256 listingId = _listSword(price);

        uint256 expectedRoyalty  = price * 500 / 10_000;
        uint256 expectedPlatform = price * 250 / 10_000;
        uint256 expectedSeller   = price - expectedRoyalty - expectedPlatform;

        vm.expectEmit(true, true, true, true, address(market));
        emit PixelRealmMarketplace.ItemSold(
            listingId, bob, alice, price, expectedRoyalty, expectedPlatform, expectedSeller
        );
        vm.prank(bob);
        market.buyItem{value: price}(listingId);
    }

    function test_BuyERC1155_Overpayment_Refunded() public {
        uint256 price = 1 ether;
        uint256 listingId = _listSword(price);

        uint256 bobBefore = bob.balance;
        vm.prank(bob);
        market.buyItem{value: 2 ether}(listingId); // overpay by 1 ether

        // Bob should have spent exactly the listing price
        assertEq(bobBefore - bob.balance, price);
    }

    function test_BuyERC1155_Reverts_NotActive() public {
        uint256 listingId = _listSword(1 ether);
        vm.prank(bob);
        market.buyItem{value: 1 ether}(listingId);

        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(PixelRealmMarketplace.ListingNotActive.selector, listingId));
        market.buyItem{value: 1 ether}(listingId);
    }

    function test_BuyERC1155_Reverts_SelfPurchase() public {
        uint256 listingId = _listSword(1 ether);

        vm.prank(alice);
        vm.expectRevert(PixelRealmMarketplace.SelfPurchase.selector);
        market.buyItem{value: 1 ether}(listingId);
    }

    function test_BuyERC1155_Reverts_InsufficientPayment() public {
        uint256 listingId = _listSword(1 ether);

        vm.prank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(PixelRealmMarketplace.InsufficientPayment.selector, 1 ether, 0.5 ether)
        );
        market.buyItem{value: 0.5 ether}(listingId);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Buy ERC-721 land
    // ─────────────────────────────────────────────────────────────────────────────

    function test_BuyERC721_TokenTransferred() public {
        uint256 landTokenId = land.getTokenId(ZONE_ID, PLOT_IDX);

        vm.startPrank(alice);
        land.approve(address(market), landTokenId);
        uint256 listingId = market.listERC721(address(land), landTokenId, 2 ether);
        vm.stopPrank();

        vm.prank(bob);
        market.buyItem{value: 2 ether}(listingId);

        assertEq(land.ownerOf(landTokenId), bob);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Cancellation
    // ─────────────────────────────────────────────────────────────────────────────

    function test_Cancel_ReturnsSwordToSeller() public {
        uint256 listingId = _listSword(1 ether);
        assertEq(items.balanceOf(alice, SWORD), 7);

        vm.prank(alice);
        market.cancelListing(listingId);

        assertEq(items.balanceOf(alice, SWORD), 10); // restored
        assertFalse(market.getListing(listingId).active);
    }

    function test_Cancel_EmitsEvent() public {
        uint256 listingId = _listSword(1 ether);

        vm.expectEmit(true, true, false, false, address(market));
        emit PixelRealmMarketplace.ListingCancelled(listingId, alice);
        vm.prank(alice);
        market.cancelListing(listingId);
    }

    function test_Cancel_Reverts_NotSeller() public {
        uint256 listingId = _listSword(1 ether);

        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(PixelRealmMarketplace.NotSeller.selector, listingId));
        market.cancelListing(listingId);
    }

    function test_Cancel_Reverts_NotActive() public {
        uint256 listingId = _listSword(1 ether);
        vm.prank(alice);
        market.cancelListing(listingId);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(PixelRealmMarketplace.ListingNotActive.selector, listingId));
        market.cancelListing(listingId);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Pagination / getListings
    // ─────────────────────────────────────────────────────────────────────────────

    function test_GetListings_Paginated() public {
        vm.startPrank(alice);
        items.setApprovalForAll(address(market), true);
        market.listERC1155(address(items), SWORD, 1, 1 ether);
        market.listERC1155(address(items), SWORD, 1, 2 ether);
        market.listERC1155(address(items), POTION, 1, 0.1 ether);
        vm.stopPrank();

        PixelRealmMarketplace.Listing[] memory page = market.getListings(1, 2);
        assertEq(page.length, 2);
        assertEq(page[0].priceWei, 1 ether);
        assertEq(page[1].priceWei, 2 ether);
    }

    function test_GetListingsBySeller() public {
        vm.startPrank(alice);
        items.setApprovalForAll(address(market), true);
        market.listERC1155(address(items), SWORD, 1, 1 ether);
        market.listERC1155(address(items), POTION, 1, 0.5 ether);
        vm.stopPrank();

        uint256[] memory ids = market.getListingIdsBySeller(alice);
        assertEq(ids.length, 2);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────────────────────────────────────

    function test_SetTreasury() public {
        address newTreasury = makeAddr("newTreasury");
        vm.prank(admin);
        market.setTreasury(newTreasury);
        assertEq(market.treasury(), newTreasury);
    }

    function test_SetTreasury_Reverts_NotAdmin() public {
        vm.prank(attacker);
        vm.expectRevert();
        market.setTreasury(attacker);
    }

    function test_Pause_BlocksListing() public {
        vm.prank(admin);
        market.pause();

        vm.startPrank(alice);
        items.setApprovalForAll(address(market), true);
        vm.expectRevert();
        market.listERC1155(address(items), SWORD, 1, 1 ether);
        vm.stopPrank();
    }

    function test_Pause_BlocksBuy() public {
        uint256 listingId = _listSword(1 ether);

        vm.prank(admin);
        market.pause();

        vm.prank(bob);
        vm.expectRevert();
        market.buyItem{value: 1 ether}(listingId);
    }

    function test_Pause_AllowsCancel() public {
        uint256 listingId = _listSword(1 ether);

        vm.prank(admin);
        market.pause();

        // Cancellations should still work while paused (seller can reclaim tokens)
        vm.prank(alice);
        market.cancelListing(listingId);
        assertFalse(market.getListing(listingId).active);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Fuzz
    // ─────────────────────────────────────────────────────────────────────────────

    function testFuzz_BuyDistribution_AlwaysSumsToPrice(uint96 salePrice) public {
        salePrice = uint96(bound(salePrice, 0.001 ether, 100 ether));

        vm.startPrank(alice);
        items.setApprovalForAll(address(market), true);
        uint256 listingId = market.listERC1155(address(items), SWORD, 1, salePrice);
        vm.stopPrank();

        vm.deal(bob, salePrice);

        uint256 treasuryBefore = treasury.balance;
        uint256 aliceBefore    = alice.balance;
        uint256 bobBefore      = bob.balance;

        vm.prank(bob);
        market.buyItem{value: salePrice}(listingId);

        // Conservation: bob spent `salePrice`, alice + treasury received it
        uint256 totalReceived = (treasury.balance - treasuryBefore) + (alice.balance - aliceBefore);
        assertEq(totalReceived, salePrice);
        assertEq(bobBefore - bob.balance, salePrice);
    }
}
