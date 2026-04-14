/**
 * WalletPanel — connect / link / unlink an EVM wallet from the settings UI.
 *
 * Uses @wagmi/core v2 + viem, lazy-loaded when the panel first opens so that
 * non-wallet players pay zero bundle cost.
 *
 * Connectors supported (all lazy-loaded):
 *   - MetaMask          (injected)
 *   - WalletConnect v2  (requires VITE_WALLETCONNECT_PROJECT_ID)
 *   - Coinbase Wallet
 *
 * Auth flow:
 *   1. Player connects wallet locally (wagmi).
 *   2. GET /auth/wallet/challenge → SIWE message.
 *   3. Player signs with wallet (signMessage).
 *   4. POST /auth/wallet/link → verify + link in DB.
 *
 * JWT access token is read from localStorage key 'pr_accessToken'.
 */

import Phaser from 'phaser';
import { CANVAS } from '../config/constants';

// ── Layout ────────────────────────────────────────────────────────────────────

const PANEL_W = 200;
const PANEL_H = 140;
const PANEL_X = (CANVAS.WIDTH  - PANEL_W) / 2;
const PANEL_Y = (CANVAS.HEIGHT - PANEL_H) / 2;
const DEPTH   = 80;
const PAD     = 6;
const BTN_H   = 10;

// ── Colours ───────────────────────────────────────────────────────────────────

const C_BG       = 0x07070f;
const C_BORDER   = 0x5533aa;
const C_HEADER   = 0x111128;
const C_TITLE    = '#cc99ff';
const C_ADDR     = '#88ffcc';
const C_LABEL    = '#8899bb';
const C_BTN_BG   = 0x221144;
const C_BTN_HOV  = 0x3322aa;
const C_BTN_TEXT = '#ddccff';
const C_ERR      = '#ff6666';
const C_OK       = '#88ff88';
const C_HINT     = '#556677';

// ── Auth URL (auth server, separate from Colyseus) ────────────────────────────

const AUTH_HTTP: string =
  ((import.meta as Record<string, unknown>).env?.['VITE_AUTH_URL'] as string | undefined)
  ?? 'http://localhost:3001';

// ── WalletPanel ───────────────────────────────────────────────────────────────

type WagmiConfig   = import('@wagmi/core').Config;
type ConnectorFn   = () => import('@wagmi/core').Connector;

interface WagmiLib {
  config:      WagmiConfig;
  connect:     typeof import('@wagmi/core').connect;
  disconnect:  typeof import('@wagmi/core').disconnect;
  getAccount:  typeof import('@wagmi/core').getAccount;
  signMessage: typeof import('@wagmi/core').signMessage;
  connectors:  { name: string; fn: ConnectorFn }[];
}

export class WalletPanel {
  private scene:   Phaser.Scene;
  private visible  = false;

  private container: Phaser.GameObjects.Container;

  // Loaded on first open
  private wagmi: WagmiLib | null = null;
  private loading = false;

  // Display state
  private linkedAddress: string | null = null;
  private status = '';
  private statusOk = true;

  constructor(scene: Phaser.Scene) {
    this.scene   = scene;
    this.container = scene.add.container(0, 0).setDepth(DEPTH).setScrollFactor(0).setVisible(false);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async show(): Promise<void> {
    if (this.visible) return;
    this.visible = true;
    this.container.setVisible(true);

    // Fetch current wallet status from server first
    await this.fetchWalletStatus();

    // Lazy-load wagmi on first open
    if (!this.wagmi) {
      await this.initWagmi();
    }

    this.rebuild();
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.container.setVisible(false);
  }

  toggle(): void {
    if (this.visible) { this.hide(); } else { void this.show(); }
  }

  // ── wagmi initialisation (lazy) ───────────────────────────────────────────

  private async initWagmi(): Promise<void> {
    try {
      const [core, chains, connModule] = await Promise.all([
        import('@wagmi/core'),
        import('viem/chains'),
        import('@wagmi/connectors'),
      ]);

      const { createConfig, http, connect, disconnect, getAccount, signMessage } = core;
      const { mainnet } = chains;
      const { injected, walletConnect, coinbaseWallet } = connModule;

      const wcProjectId = (import.meta as Record<string, unknown>).env?.['VITE_WALLETCONNECT_PROJECT_ID'] as string | undefined;

      const connectors: { name: string; fn: ConnectorFn }[] = [
        { name: 'MetaMask',        fn: () => injected({ target: 'metaMask' }) },
        { name: 'Coinbase Wallet', fn: () => coinbaseWallet({ appName: 'PixelRealm' }) },
      ];

      if (wcProjectId) {
        connectors.splice(1, 0, {
          name: 'WalletConnect',
          fn: () => walletConnect({ projectId: wcProjectId }),
        });
      }

      const config = createConfig({
        chains: [mainnet],
        transports: { [mainnet.id]: http() },
      });

      this.wagmi = { config, connect, disconnect, getAccount, signMessage, connectors };
    } catch (err) {
      console.warn('[WalletPanel] Failed to load wagmi:', err);
      this.setStatus('Wallet library failed to load', false);
    }
  }

  // ── API helpers ───────────────────────────────────────────────────────────

  private getAccessToken(): string | null {
    return localStorage.getItem('pr_accessToken');
  }

  private async fetchWalletStatus(): Promise<void> {
    const token = this.getAccessToken();
    if (!token) return;

    try {
      const res = await fetch(`${AUTH_HTTP}/auth/wallet/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json() as { walletAddress: string | null };
        this.linkedAddress = data.walletAddress ?? null;
      }
    } catch {
      // Network error — keep current state, don't block UI
    }
  }

  /** Full connect → challenge → sign → link flow. */
  private async connectAndLink(connectorName: string): Promise<void> {
    if (!this.wagmi || this.loading) return;
    const token = this.getAccessToken();
    if (!token) {
      this.setStatus('Not logged in — cannot link wallet', false);
      this.rebuild();
      return;
    }

    this.loading = true;
    this.setStatus('Connecting wallet…', true);
    this.rebuild();

    try {
      const { config, connect, getAccount, signMessage, connectors } = this.wagmi;
      const entry = connectors.find(c => c.name === connectorName);
      if (!entry) throw new Error(`Unknown connector: ${connectorName}`);

      // 1. Connect wallet
      await connect(config, { connector: entry.fn() });
      const account = getAccount(config);
      if (!account.address) throw new Error('No address after connect');

      this.setStatus('Getting challenge…', true);
      this.rebuild();

      // 2. Fetch SIWE challenge
      const chalRes = await fetch(
        `${AUTH_HTTP}/auth/wallet/challenge?address=${encodeURIComponent(account.address)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!chalRes.ok) throw new Error(`Challenge failed: ${chalRes.status}`);
      const { message } = await chalRes.json() as { message: string };

      this.setStatus('Sign the message in your wallet…', true);
      this.rebuild();

      // 3. Sign SIWE message
      const signature = await signMessage(config, { message });

      this.setStatus('Verifying…', true);
      this.rebuild();

      // 4. Link wallet on server
      const linkRes = await fetch(`${AUTH_HTTP}/auth/wallet/link`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, signature }),
      });
      if (!linkRes.ok) {
        const err = await linkRes.json() as { error?: string };
        throw new Error(err.error ?? `Link failed: ${linkRes.status}`);
      }
      const data = await linkRes.json() as { walletAddress: string };
      this.linkedAddress = data.walletAddress;
      this.setStatus('Wallet linked!', true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.setStatus(msg, false);
    } finally {
      this.loading = false;
      this.rebuild();
    }
  }

  private async unlinkWallet(): Promise<void> {
    const token = this.getAccessToken();
    if (!token) {
      this.setStatus('Not logged in', false);
      this.rebuild();
      return;
    }

    this.loading = true;
    this.setStatus('Unlinking…', true);
    this.rebuild();

    try {
      const res = await fetch(`${AUTH_HTTP}/auth/wallet/unlink`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? `Unlink failed: ${res.status}`);
      }

      // Also disconnect local wagmi state if connected
      if (this.wagmi) {
        const { config, disconnect, getAccount } = this.wagmi;
        const acct = getAccount(config);
        if (acct.isConnected) {
          await disconnect(config).catch(() => {});
        }
      }

      this.linkedAddress = null;
      this.setStatus('Wallet unlinked.', true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.setStatus(msg, false);
    } finally {
      this.loading = false;
      this.rebuild();
    }
  }

  // ── State helpers ─────────────────────────────────────────────────────────

  private setStatus(msg: string, ok: boolean): void {
    this.status  = msg;
    this.statusOk = ok;
  }

  // ── Build / render ────────────────────────────────────────────────────────

  private rebuild(): void {
    this.container.removeAll(true);

    const add = this.scene.add;

    // Background + border
    const bg = add.rectangle(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, C_BG, 0.93)
      .setOrigin(0, 0).setScrollFactor(0);
    const border = add.graphics().setScrollFactor(0);
    border.lineStyle(1, C_BORDER, 0.9);
    border.strokeRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);

    // Header bar
    const hdr = add.rectangle(PANEL_X, PANEL_Y, PANEL_W, 14, C_HEADER, 1)
      .setOrigin(0, 0).setScrollFactor(0);
    add.text(PANEL_X + PANEL_W / 2, PANEL_Y + 7, 'WALLET', {
      fontSize: '7px', color: C_TITLE, fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0);

    // Close [X]
    const closeBtn = add.text(PANEL_X + PANEL_W - PAD, PANEL_Y + 7, '[X]', {
      fontSize: '5px', color: C_HINT, fontFamily: 'monospace',
    }).setOrigin(1, 0.5).setScrollFactor(0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.hide());

    let y = PANEL_Y + 20;

    if (this.linkedAddress) {
      // ── Linked state ──────────────────────────────────────────────────────
      add.text(PANEL_X + PAD, y, 'Linked wallet:', {
        fontSize: '5px', color: C_LABEL, fontFamily: 'monospace',
      }).setOrigin(0).setScrollFactor(0);
      y += 8;

      // Show truncated address: 0x1234…abcd
      const short = `${this.linkedAddress.slice(0, 6)}…${this.linkedAddress.slice(-4)}`;
      add.text(PANEL_X + PAD, y, short, {
        fontSize: '6px', color: C_ADDR, fontFamily: 'monospace',
      }).setOrigin(0).setScrollFactor(0);
      y += 12;

      this.addButton(y, 'Unlink Wallet', C_ERR, () => { void this.unlinkWallet(); });
      y += BTN_H + 4;
    } else {
      // ── Unlinked state ────────────────────────────────────────────────────
      add.text(PANEL_X + PAD, y, 'No wallet linked.', {
        fontSize: '5px', color: C_LABEL, fontFamily: 'monospace',
      }).setOrigin(0).setScrollFactor(0);
      y += 10;

      if (!this.wagmi) {
        add.text(PANEL_X + PAD, y, 'Loading…', {
          fontSize: '5px', color: C_HINT, fontFamily: 'monospace',
        }).setOrigin(0).setScrollFactor(0);
        y += 8;
      } else {
        for (const c of this.wagmi.connectors) {
          const name = c.name;
          this.addButton(y, `Connect ${name}`, C_BTN_TEXT, () => {
            void this.connectAndLink(name);
          });
          y += BTN_H + 3;
        }
      }
    }

    // Status / error line
    if (this.status) {
      add.text(PANEL_X + PAD, y + 2, this.status, {
        fontSize: '5px', color: this.statusOk ? C_OK : C_ERR,
        fontFamily: 'monospace',
        wordWrap: { width: PANEL_W - PAD * 2, useAdvancedWrap: false },
      }).setOrigin(0).setScrollFactor(0);
    }

    this.container.add([bg, border, hdr, ...this.container.list]);
  }

  private addButton(
    y: number,
    label: string,
    color: string,
    onClick: () => void,
  ): void {
    const btnW = PANEL_W - PAD * 2;
    const add   = this.scene.add;

    const btnBg = add.rectangle(PANEL_X + PAD, y, btnW, BTN_H, C_BTN_BG, 0.9)
      .setOrigin(0, 0).setScrollFactor(0).setInteractive({ useHandCursor: true });
    const btnTxt = add.text(PANEL_X + PANEL_W / 2, y + BTN_H / 2, label, {
      fontSize: '5px', color, fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0);

    btnBg.on('pointerover',  () => btnBg.setFillStyle(C_BTN_HOV, 0.9));
    btnBg.on('pointerout',   () => btnBg.setFillStyle(C_BTN_BG,  0.9));
    btnBg.on('pointerdown',  onClick);
    btnTxt.setInteractive({ useHandCursor: true }).on('pointerdown', onClick);

    this.container.add([btnBg, btnTxt]);
  }
}
