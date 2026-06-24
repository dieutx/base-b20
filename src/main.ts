import {
  type Address,
  type Hex,
  createPublicClient,
  createWalletClient,
  custom,
  encodeFunctionData,
  formatUnits,
  http,
} from "viem";
import { baseSepolia } from "viem/chains";

import {
  B20_ASSET_VARIANT,
  B20_FACTORY_ABI,
  B20_FACTORY_ADDRESS,
  B20_TOKEN_ABI,
  buildAssetInitCalls,
  encodeAssetCreateParams,
  makeSalt,
  parseTokenAmount,
} from "./b20";
import { hasDeployedCode } from "./deployedCode";
import "./styles.css";
import {
  type DiscoveredWallet,
  type Eip1193Provider,
  watchWalletProviders,
} from "./wallets";

const BASE_SEPOLIA_CHAIN_HEX = "0x14a34";

const state: {
  wallets: DiscoveredWallet[];
  provider?: Eip1193Provider;
  account?: Address;
  predictedToken?: Address;
  token?: Address;
  walletManuallySelected: boolean;
} = {
  wallets: [],
  walletManuallySelected: false,
};

const $ = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element #${id}`);
  }
  return element as T;
};

const elements = {
  walletSelect: $<HTMLSelectElement>("walletSelect"),
  networkStatus: $("networkStatus"),
  accountValue: $("accountValue"),
  predictedValue: $("predictedValue"),
  tokenValue: $("tokenValue"),
  balanceValue: $("balanceValue"),
  log: $("log"),
  tokenName: $<HTMLInputElement>("tokenName"),
  tokenSymbol: $<HTMLInputElement>("tokenSymbol"),
  tokenDecimals: $<HTMLInputElement>("tokenDecimals"),
  supplyCap: $<HTMLInputElement>("supplyCap"),
  mintAmount: $<HTMLInputElement>("mintAmount"),
  salt: $<HTMLInputElement>("salt"),
  rpcUrl: $<HTMLInputElement>("rpcUrl"),
  connectWallet: $<HTMLButtonElement>("connectWallet"),
  switchNetwork: $<HTMLButtonElement>("switchNetwork"),
  previewAddress: $<HTMLButtonElement>("previewAddress"),
  deployToken: $<HTMLButtonElement>("deployToken"),
  mintToken: $<HTMLButtonElement>("mintToken"),
};

function log(message: string): void {
  const timestamp = new Date().toLocaleTimeString();
  elements.log.textContent = `[${timestamp}] ${message}\n${elements.log.textContent ?? ""}`;
}

function setText(element: HTMLElement, value?: string): void {
  element.textContent = value && value.length > 0 ? value : "-";
}

function clearTokenSelection(): void {
  state.predictedToken = undefined;
  state.token = undefined;
  setText(elements.predictedValue);
  setText(elements.tokenValue);
  setText(elements.balanceValue);
  elements.mintToken.disabled = true;
}

function getSelectedWallet(): DiscoveredWallet {
  const wallet = state.wallets.find((item) => item.id === elements.walletSelect.value) ?? state.wallets[0];
  if (!wallet) {
    throw new Error("No injected wallet found. Open this URL in a browser with MetaMask, OKX, or another wallet extension.");
  }
  return wallet;
}

function getDecimals(): number {
  return Number.parseInt(elements.tokenDecimals.value, 10);
}

function getRpcUrl(): string {
  const rpcUrl = elements.rpcUrl.value.trim();
  if (!/^https?:\/\/\S+$/i.test(rpcUrl)) {
    throw new Error("RPC URL must start with http:// or https://.");
  }
  return rpcUrl;
}

function getPublicClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(getRpcUrl()),
  });
}

function getWalletClient() {
  if (!state.provider || !state.account) {
    throw new Error("Connect a wallet first.");
  }
  return createWalletClient({
    account: state.account,
    chain: baseSepolia,
    transport: custom(state.provider),
  });
}

async function requestAccounts(provider: Eip1193Provider): Promise<Address[]> {
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  if (!Array.isArray(accounts) || typeof accounts[0] !== "string") {
    throw new Error("Wallet did not return an account.");
  }
  return accounts as Address[];
}

async function getChainId(provider: Eip1193Provider): Promise<string> {
  const chainId = await provider.request({ method: "eth_chainId" });
  if (typeof chainId !== "string") {
    throw new Error("Wallet did not return a chain ID.");
  }
  return chainId;
}

function getErrorCode(error: unknown): number | undefined {
  return typeof error === "object" && error !== null && "code" in error ? Number(error.code) : undefined;
}

async function switchToBaseSepolia(provider: Eip1193Provider): Promise<void> {
  const rpcUrl = getRpcUrl();
  try {
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: BASE_SEPOLIA_CHAIN_HEX,
          chainName: "Base Sepolia",
          nativeCurrency: {
            name: "Sepolia Ether",
            symbol: "ETH",
            decimals: 18,
          },
          rpcUrls: [rpcUrl],
          blockExplorerUrls: ["https://sepolia.basescan.org"],
        },
      ],
    });
  } catch (error) {
    if (getErrorCode(error) === 4001) {
      throw error;
    }
    log("Wallet did not add/update the RPC automatically. If deploy still fails, update Base Sepolia RPC in the wallet settings.");
  }

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BASE_SEPOLIA_CHAIN_HEX }],
    });
  } catch (error) {
    if (getErrorCode(error) !== 4902) {
      throw error;
    }

    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: BASE_SEPOLIA_CHAIN_HEX,
          chainName: "Base Sepolia",
          nativeCurrency: {
            name: "Sepolia Ether",
            symbol: "ETH",
            decimals: 18,
          },
          rpcUrls: [rpcUrl],
          blockExplorerUrls: ["https://sepolia.basescan.org"],
        },
      ],
    });
  }
}

function updateWalletOptions(wallets: DiscoveredWallet[]): void {
  const previous = elements.walletSelect.value;
  elements.walletSelect.replaceChildren(
    ...wallets.map((wallet) => {
      const option = document.createElement("option");
      option.value = wallet.id;
      option.textContent = wallet.rdns ? `${wallet.name} (${wallet.rdns})` : wallet.name;
      return option;
    }),
  );

  if (state.walletManuallySelected && wallets.some((wallet) => wallet.id === previous)) {
    elements.walletSelect.value = previous;
  } else if (wallets.length > 0) {
    elements.walletSelect.value = wallets[0].id;
  }
}

async function refreshNetworkStatus(): Promise<void> {
  if (!state.provider || !state.account) {
    elements.networkStatus.textContent = "Wallet not connected";
    return;
  }

  const chainId = await getChainId(state.provider);
  elements.networkStatus.textContent =
    chainId.toLowerCase() === BASE_SEPOLIA_CHAIN_HEX ? "Connected to Base Sepolia" : `Wrong network: ${chainId}`;
}

async function ensureBaseSepolia(provider: Eip1193Provider): Promise<void> {
  const chainId = await getChainId(provider);
  if (chainId.toLowerCase() !== BASE_SEPOLIA_CHAIN_HEX) {
    throw new Error('Click "Add/Switch Base Sepolia" and approve the wallet network prompt before deploying.');
  }
}

function readTokenForm() {
  const decimals = getDecimals();
  const account = state.account;
  if (!account) {
    throw new Error("Connect a wallet first.");
  }

  const supplyCap = parseTokenAmount(elements.supplyCap.value, decimals);
  const salt = makeSalt(elements.salt.value);

  return {
    account,
    decimals,
    salt,
    name: elements.tokenName.value,
    symbol: elements.tokenSymbol.value,
    supplyCap,
    params: encodeAssetCreateParams({
      name: elements.tokenName.value,
      symbol: elements.tokenSymbol.value,
      initialAdmin: account,
      decimals,
    }),
    initCalls: buildAssetInitCalls({
      minter: account,
      supplyCap,
    }),
  };
}

async function connectWallet(): Promise<void> {
  const wallet = getSelectedWallet();
  state.provider = wallet.provider;

  const [account] = await requestAccounts(wallet.provider);
  if (state.account && state.account.toLowerCase() !== account.toLowerCase()) {
    clearTokenSelection();
  }
  state.account = account;
  setText(elements.accountValue, account);
  log(`Connected ${wallet.name}: ${account}`);
  await refreshNetworkStatus();
}

async function predictTokenAddress(): Promise<Address> {
  const form = readTokenForm();
  const token = await getPublicClient().readContract({
    address: B20_FACTORY_ADDRESS,
    abi: B20_FACTORY_ABI,
    functionName: "getB20Address",
    args: [B20_ASSET_VARIANT, form.account, form.salt],
  });

  state.predictedToken = token;
  setText(elements.predictedValue, token);
  log(`Predicted token address: ${token}`);
  return token;
}

async function previewTokenAddress(): Promise<Address> {
  const token = await predictTokenAddress();
  if (await tokenExists(token)) {
    useExistingToken(token);
  }
  return token;
}

async function tokenExists(token: Address): Promise<boolean> {
  const code = await getPublicClient().getCode({ address: token });
  return hasDeployedCode(code);
}

function useExistingToken(token: Address): void {
  state.token = token;
  setText(elements.tokenValue, token);
  elements.mintToken.disabled = false;
  log(`Token already exists at ${token}. Use Mint, or change Salt to deploy a new token.`);
}

async function estimateContractGasWithBuffer(args: {
  account: Address;
  to: Address;
  data: Hex;
}): Promise<bigint> {
  const gas = await getPublicClient().estimateGas({
    account: args.account,
    to: args.to,
    data: args.data,
  });
  return (gas * 120n) / 100n;
}

async function deployToken(): Promise<void> {
  if (!state.provider) {
    throw new Error("Connect a wallet first.");
  }

  await ensureBaseSepolia(state.provider);
  await refreshNetworkStatus();

  const form = readTokenForm();
  const predictedToken = await predictTokenAddress();
  if (await tokenExists(predictedToken)) {
    useExistingToken(predictedToken);
    throw new Error("This wallet and salt already created a B20 token. Use Mint for the existing token, or change Salt to deploy a new one.");
  }

  const walletClient = getWalletClient();
  const deployData = encodeFunctionData({
    abi: B20_FACTORY_ABI,
    functionName: "createB20",
    args: [B20_ASSET_VARIANT, form.salt, form.params, form.initCalls],
  });
  const gas = await estimateContractGasWithBuffer({
    account: form.account,
    to: B20_FACTORY_ADDRESS,
    data: deployData,
  });

  log("Waiting for wallet signature to create B20 token...");
  const hash = await walletClient.writeContract({
    address: B20_FACTORY_ADDRESS,
    abi: B20_FACTORY_ABI,
    functionName: "createB20",
    args: [B20_ASSET_VARIANT, form.salt, form.params, form.initCalls],
    account: form.account,
    chain: baseSepolia,
    gas,
  });

  log(`Deploy transaction sent: ${hash}`);
  await getPublicClient().waitForTransactionReceipt({ hash });

  state.token = predictedToken;
  setText(elements.tokenValue, predictedToken);
  elements.mintToken.disabled = false;
  log(`B20 token deployed at ${predictedToken}`);
}

async function mintToken(): Promise<void> {
  if (!state.token || !state.account) {
    throw new Error("Deploy a token first.");
  }
  if (state.provider) {
    await ensureBaseSepolia(state.provider);
  }

  const walletClient = getWalletClient();
  const decimals = getDecimals();
  const amount = parseTokenAmount(elements.mintAmount.value, decimals);
  if (amount <= 0n) {
    throw new Error("Mint amount must be greater than zero.");
  }
  const mintData = encodeFunctionData({
    abi: B20_TOKEN_ABI,
    functionName: "mint",
    args: [state.account, amount],
  });
  const gas = await estimateContractGasWithBuffer({
    account: state.account,
    to: state.token,
    data: mintData,
  });

  log("Waiting for wallet signature to mint...");
  const hash = await walletClient.writeContract({
    address: state.token,
    abi: B20_TOKEN_ABI,
    functionName: "mint",
    args: [state.account, amount],
    account: state.account,
    chain: baseSepolia,
    gas,
  });

  log(`Mint transaction sent: ${hash}`);
  await getPublicClient().waitForTransactionReceipt({ hash });

  const balance = await getPublicClient().readContract({
    address: state.token,
    abi: B20_TOKEN_ABI,
    functionName: "balanceOf",
    args: [state.account],
  });
  setText(elements.balanceValue, `${formatUnits(balance, decimals)} ${elements.tokenSymbol.value.trim()}`);
  log(`Mint confirmed. Balance: ${formatUnits(balance, decimals)}`);
}

function bindAction(button: HTMLButtonElement, action: () => Promise<void>): void {
  button.addEventListener("click", () => {
    button.disabled = true;
    action()
      .catch((error: unknown) => {
        log(`Error: ${formatActionError(error)}`);
      })
      .finally(() => {
        button.disabled = false;
        if (!state.token) {
          elements.mintToken.disabled = true;
        }
      });
  });
}

function formatActionError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/requested resource not available|too many errors|rpc endpoint/i.test(message)) {
    return `${message}\n\nThis is usually the wallet RPC, not the B20 calldata. Try a Chainstack/Base Sepolia RPC in the RPC URL field, click "Add/Switch Base Sepolia", or update Base Sepolia RPC inside MetaMask/OKX network settings.`;
  }
  if (/execution reverted|estimate gas/i.test(message)) {
    return `${message}\n\nIf this happened after a successful deploy, the same wallet and Salt already created this token. Click Preview address to load it, use Mint for that token, or change Salt before deploying a new one.`;
  }
  return message;
}

watchWalletProviders((wallets) => {
  state.wallets = wallets;
  updateWalletOptions(wallets);
  if (wallets.length > 0) {
    log(`Found ${wallets.length} wallet provider${wallets.length === 1 ? "" : "s"}.`);
  }
});

bindAction(elements.connectWallet, connectWallet);
elements.walletSelect.addEventListener("change", () => {
  state.walletManuallySelected = true;
  state.provider = undefined;
  state.account = undefined;
  setText(elements.accountValue);
  elements.networkStatus.textContent = "Wallet not connected";
  clearTokenSelection();
});
elements.salt.addEventListener("input", clearTokenSelection);
bindAction(elements.switchNetwork, async () => {
  if (!state.provider) {
    throw new Error("Connect a wallet first.");
  }
  await switchToBaseSepolia(state.provider);
  await refreshNetworkStatus();
  log("Base Sepolia selected. If deploy still shows RPC errors, update the Base Sepolia RPC in wallet network settings.");
});
bindAction(elements.previewAddress, async () => {
  await previewTokenAddress();
});
bindAction(elements.deployToken, deployToken);
bindAction(elements.mintToken, mintToken);
