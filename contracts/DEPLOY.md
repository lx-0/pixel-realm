# Contracts — Deployment Guide

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) installed
- Base Sepolia ETH in deployer wallet (faucet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
- Basescan API key (https://basescan.org/register)
- Pinata account for IPFS metadata upload

---

## 1. Clone and install dependencies

```bash
git clone --recurse-submodules https://github.com/lx-0/pixel-realm.git
cd pixel-realm/contracts
forge install
```

---

## 2. Upload IPFS metadata to Pinata

Before deploying the contracts you need the IPFS CIDs for metadata.

### Items metadata
1. Export all pixel art item sprites from `public/assets/sprites/pickups/` (PNG files).
2. Upload the entire `metadata/items/` directory to Pinata as a folder.
3. Note the resulting CID, e.g. `QmAbcdef...`.
4. Set `ITEMS_BASE_URI=ipfs://QmAbcdef.../{id}.json` in your `.env`.
5. Update the `image` fields in each `metadata/items/*.json` to use the real CID.

### Land metadata
1. Upload the entire `metadata/land/` directory to Pinata as a folder.
2. Note the resulting CID.
3. Set `LAND_BASE_URI=ipfs://QmXyzdef.../` in your `.env`.

---

## 3. Set up Gnosis Safe 3-of-5 (UPGRADER_ROLE)

The `UPGRADER_ROLE` must be held by a Gnosis Safe multisig, not an EOA.

1. Go to https://app.safe.global and connect your wallet.
2. Create a new Safe on **Base Sepolia**:
   - Owners: 5 addresses (board signers)
   - Threshold: 3-of-5
3. Copy the Safe address — this is your `UPGRADER_ADDRESS`.
4. Set `UPGRADER_ADDRESS=0x<SafeAddress>` in your `.env`.

---

## 4. Configure environment

```bash
cp .env.example .env
```

Fill in all variables:

| Variable               | Description                                        |
|------------------------|----------------------------------------------------|
| `BASE_SEPOLIA_RPC_URL` | Base Sepolia RPC endpoint (e.g. from Alchemy)     |
| `BASESCAN_API_KEY`     | Basescan API key for verification                  |
| `DEPLOYER_PRIVATE_KEY` | EOA private key (0x-prefixed, never commit)        |
| `ADMIN_ADDRESS`        | Receives `DEFAULT_ADMIN_ROLE` (role management)    |
| `MINTER_ADDRESS`       | Server operator hot wallet — receives `MINTER_ROLE`|
| `UPGRADER_ADDRESS`     | Gnosis Safe 3-of-5 — receives `UPGRADER_ROLE`      |
| `TREASURY_ADDRESS`     | Studio treasury for ERC-2981 royalties             |
| `ITEMS_BASE_URI`       | `ipfs://QmItemsCID/{id}.json`                      |
| `LAND_BASE_URI`        | `ipfs://QmLandCID/`                                |

---

## 5. Deploy to Base Sepolia

```bash
source .env
forge script script/Deploy.s.sol \
  --rpc-url base_sepolia \
  --broadcast \
  --verify \
  --etherscan-api-key "$BASESCAN_API_KEY" \
  -vvvv
```

The script prints deployed proxy addresses. Save them:

```
PixelRealmItems proxy:  0x...
PixelRealmLand proxy:   0x...
```

---

## 6. Verify on Basescan

If `--verify` succeeds during deploy, verification is done. If it failed:

```bash
# Items implementation
forge verify-contract <ITEMS_IMPL_ADDRESS> \
  src/PixelRealmItems.sol:PixelRealmItems \
  --chain base-sepolia \
  --etherscan-api-key "$BASESCAN_API_KEY"

# Items proxy
forge verify-contract <ITEMS_PROXY_ADDRESS> \
  lib/openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy \
  --chain base-sepolia \
  --etherscan-api-key "$BASESCAN_API_KEY" \
  --constructor-args $(cast abi-encode "constructor(address,bytes)" <IMPL_ADDR> <INIT_DATA>)
```

Repeat for `PixelRealmLand`.

---

## 7. Post-deployment: set per-item URIs

After Pinata upload and deployment, call `setTokenURI` for each item type to override
the base URI with per-type IPFS links:

```bash
cast send <ITEMS_PROXY_ADDRESS> \
  "setTokenURI(uint256,string)" 1 "ipfs://QmItemsCID/1.json" \
  --rpc-url base_sepolia \
  --private-key "$DEPLOYER_PRIVATE_KEY"
```

---

## 8. CI (automatic)

GitHub Actions runs `forge test` and Slither on every push that touches `contracts/`.
Deployment to Base Sepolia is triggered manually via `workflow_dispatch` or by pushing a
tag matching `deploy/*` (e.g. `git tag deploy/v1.0.0 && git push --tags`).

Secrets required in the `base-sepolia` GitHub Actions environment:
- `DEPLOYER_PRIVATE_KEY`, `BASESCAN_API_KEY`, `BASE_SEPOLIA_RPC_URL`
- `ADMIN_ADDRESS`, `MINTER_ADDRESS`, `UPGRADER_ADDRESS`, `TREASURY_ADDRESS`

Variables (non-secret):
- `ITEMS_BASE_URI`, `LAND_BASE_URI`
