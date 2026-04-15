// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {PixelRealmItems} from "../src/PixelRealmItems.sol";
import {PixelRealmLand} from "../src/PixelRealmLand.sol";
import {PixelRealmMarketplace} from "../src/PixelRealmMarketplace.sol";

/// @title Deploy
/// @notice Deploys PixelRealmItems and PixelRealmLand behind ERC-1967 UUPS proxies.
///
/// Usage (Base Sepolia):
///   forge script script/Deploy.s.sol \
///     --rpc-url base_sepolia \
///     --broadcast \
///     --verify \
///     --etherscan-api-key $BASESCAN_API_KEY \
///     -vvvv
///
/// Required env vars:
///   DEPLOYER_PRIVATE_KEY   — deployer EOA private key
///   ADMIN_ADDRESS          — will receive DEFAULT_ADMIN_ROLE on all contracts
///   MINTER_ADDRESS         — will receive MINTER_ROLE (server operator key)
///   UPGRADER_ADDRESS       — will receive UPGRADER_ROLE (Gnosis Safe 3-of-5)
///   TREASURY_ADDRESS       — ERC-2981 royalty recipient + marketplace platform fees
///   ITEMS_BASE_URI         — base IPFS URI for items (e.g. "ipfs://Qm.../")
///   LAND_BASE_URI          — base IPFS URI for land  (e.g. "ipfs://Qm.../")
contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address admin = vm.envAddress("ADMIN_ADDRESS");
        address minter = vm.envAddress("MINTER_ADDRESS");
        address upgrader = vm.envAddress("UPGRADER_ADDRESS");
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        string memory itemsUri = vm.envString("ITEMS_BASE_URI");
        string memory landUri = vm.envString("LAND_BASE_URI");

        vm.startBroadcast(deployerKey);

        // ── PixelRealmItems ──────────────────────────────────────────────────────
        PixelRealmItems itemsImpl = new PixelRealmItems();
        bytes memory itemsInit = abi.encodeCall(
            PixelRealmItems.initialize,
            (itemsUri, treasury, admin, minter, upgrader)
        );
        ERC1967Proxy itemsProxy = new ERC1967Proxy(address(itemsImpl), itemsInit);
        PixelRealmItems items = PixelRealmItems(address(itemsProxy));

        console2.log("PixelRealmItems implementation:", address(itemsImpl));
        console2.log("PixelRealmItems proxy:         ", address(itemsProxy));

        // ── PixelRealmLand ───────────────────────────────────────────────────────
        PixelRealmLand landImpl = new PixelRealmLand();
        bytes memory landInit = abi.encodeCall(
            PixelRealmLand.initialize,
            (landUri, treasury, admin, minter, upgrader)
        );
        ERC1967Proxy landProxy = new ERC1967Proxy(address(landImpl), landInit);
        PixelRealmLand land = PixelRealmLand(address(landProxy));

        console2.log("PixelRealmLand implementation: ", address(landImpl));
        console2.log("PixelRealmLand proxy:          ", address(landProxy));

        // ── PixelRealmMarketplace ────────────────────────────────────────────────
        PixelRealmMarketplace marketImpl = new PixelRealmMarketplace();
        bytes memory marketInit = abi.encodeCall(
            PixelRealmMarketplace.initialize,
            (treasury, admin, upgrader)
        );
        ERC1967Proxy marketProxy = new ERC1967Proxy(address(marketImpl), marketInit);
        PixelRealmMarketplace marketplace = PixelRealmMarketplace(address(marketProxy));

        console2.log("PixelRealmMarketplace implementation:", address(marketImpl));
        console2.log("PixelRealmMarketplace proxy:         ", address(marketProxy));

        vm.stopBroadcast();

        // Sanity assertions (run in simulation; don't revert on-chain)
        assert(items.hasRole(items.MINTER_ROLE(), minter));
        assert(items.hasRole(items.UPGRADER_ROLE(), upgrader));
        assert(land.hasRole(land.MINTER_ROLE(), minter));
        assert(land.hasRole(land.UPGRADER_ROLE(), upgrader));
        assert(marketplace.hasRole(marketplace.UPGRADER_ROLE(), upgrader));
        assert(marketplace.treasury() == treasury);

        console2.log("\n=== Deployment summary ===");
        console2.log("Network:             Base Sepolia");
        console2.log("Admin:              ", admin);
        console2.log("Minter:             ", minter);
        console2.log("Upgrader (Safe):    ", upgrader);
        console2.log("Treasury:           ", treasury);
        console2.log("Items proxy:        ", address(itemsProxy));
        console2.log("Land  proxy:        ", address(landProxy));
        console2.log("Marketplace proxy:  ", address(marketProxy));
        console2.log("==========================\n");
    }
}
