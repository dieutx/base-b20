import { describe, expect, test, vi } from "vitest";

import { type DiscoveredWallet, type Eip1193Provider, sortWallets, watchWalletProviders } from "./wallets";

class WalletTarget extends EventTarget {
  ethereum?: Eip1193Provider;
}

const provider = (id: string): Eip1193Provider => ({
  request: vi.fn().mockResolvedValue(id),
});

describe("wallet discovery", () => {
  test("prioritizes MetaMask as the default wallet", () => {
    const wallets: DiscoveredWallet[] = [
      { id: "okx", name: "OKX Wallet", provider: provider("okx"), rdns: "com.okex.wallet" },
      { id: "metamask", name: "MetaMask", provider: provider("metamask"), rdns: "io.metamask" },
      { id: "coinbase", name: "Coinbase Wallet", provider: provider("coinbase"), rdns: "com.coinbase.wallet" },
    ];

    expect(sortWallets(wallets).map((wallet) => wallet.name)).toEqual([
      "MetaMask",
      "Coinbase Wallet",
      "OKX Wallet",
    ]);
  });

  test("collects wallets announced through EIP-6963", () => {
    const target = new WalletTarget();
    const updates: string[][] = [];

    watchWalletProviders(
      (wallets) => {
        updates.push(wallets.map((wallet) => wallet.name));
      },
      target,
      { fallbackDelayMs: 0 },
    );

    target.dispatchEvent(
      new CustomEvent("eip6963:announceProvider", {
        detail: {
          info: {
            uuid: "metamask",
            name: "MetaMask",
            icon: "",
            rdns: "io.metamask",
          },
          provider: provider("metamask"),
        },
      }),
    );

    expect(updates.at(-1)).toEqual(["MetaMask"]);
  });

  test("uses window ethereum fallback when no EIP-6963 wallet announces", async () => {
    const target = new WalletTarget();
    target.ethereum = provider("fallback");
    const updates: string[][] = [];

    watchWalletProviders(
      (wallets) => {
        updates.push(wallets.map((wallet) => wallet.name));
      },
      target,
      { fallbackDelayMs: 1 },
    );

    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(updates.at(-1)).toEqual(["Injected wallet"]);
  });
});
