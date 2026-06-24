export type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

export type Eip6963ProviderInfo = {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
};

export type Eip6963ProviderDetail = {
  info: Eip6963ProviderInfo;
  provider: Eip1193Provider;
};

export type DiscoveredWallet = {
  id: string;
  name: string;
  provider: Eip1193Provider;
  icon?: string;
  rdns?: string;
};

export type WalletTarget = EventTarget & {
  ethereum?: Eip1193Provider;
};

export type WalletDiscoveryOptions = {
  fallbackDelayMs?: number;
};

export function watchWalletProviders(
  onUpdate: (wallets: DiscoveredWallet[]) => void,
  target: WalletTarget = window,
  options: WalletDiscoveryOptions = {},
): () => void {
  const fallbackDelayMs = options.fallbackDelayMs ?? 300;
  const wallets = new Map<string, DiscoveredWallet>();

  const emit = () => {
    onUpdate([...wallets.values()]);
  };

  const addWallet = (wallet: DiscoveredWallet) => {
    if (!wallets.has(wallet.id)) {
      wallets.set(wallet.id, wallet);
      emit();
    }
  };

  const handleAnnouncement = ((event: Event) => {
    const detail = (event as CustomEvent<Eip6963ProviderDetail>).detail;
    if (!detail?.provider || !detail.info) {
      return;
    }

    addWallet({
      id: detail.info.uuid || detail.info.rdns || detail.info.name,
      name: detail.info.name,
      icon: detail.info.icon,
      rdns: detail.info.rdns,
      provider: detail.provider,
    });
  }) as EventListener;

  target.addEventListener("eip6963:announceProvider", handleAnnouncement);
  target.dispatchEvent(new Event("eip6963:requestProvider"));

  const timer = setTimeout(() => {
    if (wallets.size === 0 && target.ethereum) {
      addWallet({
        id: "window.ethereum",
        name: "Injected wallet",
        provider: target.ethereum,
      });
    }
  }, fallbackDelayMs);

  return () => {
    clearTimeout(timer);
    target.removeEventListener("eip6963:announceProvider", handleAnnouncement);
  };
}
