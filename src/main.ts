import {
  type Address,
  type Hex,
  createPublicClient,
  createWalletClient,
  custom,
  encodeFunctionData,
  formatUnits,
  http,
  isAddress,
} from "viem";
import { baseSepolia } from "viem/chains";

import {
  B20_ASSET_VARIANT,
  B20_FACTORY_ABI,
  B20_FACTORY_ADDRESS,
  buildAssetInitCalls,
  encodeAssetCreateParams,
  makeSalt,
  parseTokenAmount,
} from "./b20";
import { B20_ABI as B20_FULL_ABI } from "./b20ops/abi";
import { B20_POLICY_SCOPES, B20_ROLES } from "./b20ops/constants";
import { createMemo, type MemoRecord } from "./b20ops/memo";
import { pairMemoTransfers, validatePaymentPair, type B20RawLog } from "./b20ops/reconciliation";
import {
  deriveWorkflowSteps,
  formatPausedFeatures,
  formatPolicySummary,
  formatRoleSummary,
  getWebAppTestFlow,
  isTransferMemoNamespace,
} from "./b20ops/uiSafe";
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
  tokenDecimals?: number;
  tokenSymbol?: string;
  memo?: MemoRecord;
  receiptChecked: boolean;
  walletManuallySelected: boolean;
} = {
  wallets: [],
  receiptChecked: false,
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
  issuanceReference: $<HTMLInputElement>("issuanceReference"),
  issuanceMemoValue: $("issuanceMemoValue"),
  issuancePayloadValue: $("issuancePayloadValue"),
  salt: $<HTMLInputElement>("salt"),
  rpcUrl: $<HTMLInputElement>("rpcUrl"),
  connectWallet: $<HTMLButtonElement>("connectWallet"),
  switchNetwork: $<HTMLButtonElement>("switchNetwork"),
  previewAddress: $<HTMLButtonElement>("previewAddress"),
  deployToken: $<HTMLButtonElement>("deployToken"),
  mintToken: $<HTMLButtonElement>("mintToken"),
  manualTokenAddress: $<HTMLInputElement>("manualTokenAddress"),
  loadToken: $<HTMLButtonElement>("loadToken"),
  identityValue: $("identityValue"),
  variantValue: $("variantValue"),
  supplyValue: $("supplyValue"),
  capValue: $("capValue"),
  contractUriValue: $("contractUriValue"),
  memoNamespace: $<HTMLSelectElement>("memoNamespace"),
  memoReference: $<HTMLInputElement>("memoReference"),
  paymentRecipient: $<HTMLInputElement>("paymentRecipient"),
  useSelfRecipient: $<HTMLButtonElement>("useSelfRecipient"),
  paymentAmount: $<HTMLInputElement>("paymentAmount"),
  previewMemo: $<HTMLButtonElement>("previewMemo"),
  sendMemoPayment: $<HTMLButtonElement>("sendMemoPayment"),
  memoValue: $("memoValue"),
  memoPayloadValue: $("memoPayloadValue"),
  refreshStatus: $<HTMLButtonElement>("refreshStatus"),
  rolesValue: $("rolesValue"),
  policiesValue: $("policiesValue"),
  pausedValue: $("pausedValue"),
  receiptHash: $<HTMLInputElement>("receiptHash"),
  reconcileReceipt: $<HTMLButtonElement>("reconcileReceipt"),
  receiptValue: $("receiptValue"),
  intentStatusValue: $("intentStatusValue"),
  stepWallet: $("stepWallet"),
  stepToken: $("stepToken"),
  stepMemo: $("stepMemo"),
  stepReceipt: $("stepReceipt"),
  testFlowList: $("testFlowList"),
};

function log(message: string): void {
  const timestamp = new Date().toLocaleTimeString();
  const previous = elements.log.textContent === "No activity yet." ? "" : (elements.log.textContent ?? "");
  elements.log.textContent = `[${timestamp}] ${message}\n${previous}`;
}

function setText(element: HTMLElement, value?: string): void {
  element.textContent = value && value.length > 0 ? value : "-";
}

function clearTokenSelection(): void {
  state.predictedToken = undefined;
  state.token = undefined;
  state.tokenDecimals = undefined;
  state.tokenSymbol = undefined;
  state.memo = undefined;
  state.receiptChecked = false;
  setText(elements.predictedValue);
  setText(elements.tokenValue);
  setText(elements.balanceValue);
  setText(elements.identityValue);
  setText(elements.variantValue);
  setText(elements.supplyValue);
  setText(elements.capValue);
  setText(elements.contractUriValue);
  setText(elements.rolesValue);
  setText(elements.policiesValue);
  setText(elements.pausedValue);
  setText(elements.memoValue);
  setText(elements.memoPayloadValue);
  setText(elements.issuanceMemoValue);
  setText(elements.issuancePayloadValue);
  setText(elements.intentStatusValue, "draft");
  elements.receiptValue.textContent = "-";
  elements.mintToken.disabled = true;
  updateWorkflow();
}

function updateWorkflow(): void {
  const stepElements = {
    wallet: elements.stepWallet,
    token: elements.stepToken,
    memo: elements.stepMemo,
    receipt: elements.stepReceipt,
  };
  for (const step of deriveWorkflowSteps({
    walletConnected: Boolean(state.account),
    tokenLoaded: Boolean(state.token),
    memoReady: Boolean(state.memo),
    receiptChecked: state.receiptChecked,
  })) {
    stepElements[step.key].dataset.state = step.state;
  }
}

function resetPaymentDraft(): void {
  state.memo = undefined;
  state.receiptChecked = false;
  setText(elements.memoValue);
  setText(elements.memoPayloadValue);
  setText(elements.intentStatusValue, "draft");
  elements.receiptValue.textContent = "-";
  updateWorkflow();
}

function resetIssuanceMemo(): void {
  setText(elements.issuanceMemoValue);
  setText(elements.issuancePayloadValue);
}

function renderTestFlow(): void {
  elements.testFlowList.replaceChildren(
    ...getWebAppTestFlow().map((step, index) => {
      const card = document.createElement("article");
      card.className = "flow-card";

      const number = document.createElement("span");
      number.className = "flow-number";
      number.textContent = String(index + 1);

      const title = document.createElement("strong");
      title.textContent = step.title;

      const action = document.createElement("p");
      action.textContent = step.action;

      const expected = document.createElement("small");
      expected.textContent = step.expected;

      card.append(number, title, action, expected);
      return card;
    }),
  );
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

function getActiveDecimals(): number {
  return state.tokenDecimals ?? getDecimals();
}

function getActiveSymbol(): string {
  return state.tokenSymbol ?? elements.tokenSymbol.value.trim();
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
  updateWorkflow();
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
    await loadTokenDetails(token);
  }
  return token;
}

async function tokenExists(token: Address): Promise<boolean> {
  const code = await getPublicClient().getCode({ address: token });
  return hasDeployedCode(code);
}

function useExistingToken(token: Address): void {
  state.token = token;
  elements.manualTokenAddress.value = token;
  setText(elements.tokenValue, token);
  elements.mintToken.disabled = false;
  log(`Token already exists at ${token}. Use Mint, or change Salt to deploy a new token.`);
  updateWorkflow();
}

function getTokenToLoad(): Address {
  const value = elements.manualTokenAddress.value.trim() || state.token || state.predictedToken;
  if (!value || !isAddress(value)) {
    throw new Error("Enter a valid B20 token address first.");
  }
  return value;
}

async function loadTokenDetails(token: Address = getTokenToLoad()): Promise<void> {
  const publicClient = getPublicClient();
  const [name, symbol, decimals, totalSupply, supplyCap, contractURI] = await Promise.all([
    publicClient.readContract({ address: token, abi: B20_FULL_ABI, functionName: "name" }),
    publicClient.readContract({ address: token, abi: B20_FULL_ABI, functionName: "symbol" }),
    publicClient.readContract({ address: token, abi: B20_FULL_ABI, functionName: "decimals" }),
    publicClient.readContract({ address: token, abi: B20_FULL_ABI, functionName: "totalSupply" }),
    publicClient.readContract({ address: token, abi: B20_FULL_ABI, functionName: "supplyCap" }),
    publicClient.readContract({ address: token, abi: B20_FULL_ABI, functionName: "contractURI" }),
  ]);

  const tokenName = String(name);
  const tokenSymbol = String(symbol);
  const tokenDecimals = Number(decimals);
  const totalSupplyRaw = totalSupply as bigint;
  const supplyCapRaw = supplyCap as bigint;
  let variant = `Asset (${tokenDecimals} decimals)`;

  try {
    const currency = await publicClient.readContract({ address: token, abi: B20_FULL_ABI, functionName: "currency" });
    variant = `Stablecoin (${String(currency)}, 6 decimals)`;
  } catch {
    // Asset tokens do not expose Stablecoin currency metadata.
  }

  state.token = token;
  state.tokenDecimals = tokenDecimals;
  state.tokenSymbol = tokenSymbol;
  elements.manualTokenAddress.value = token;
  elements.mintToken.disabled = false;
  setText(elements.tokenValue, token);
  setText(elements.identityValue, `${tokenName} (${tokenSymbol})`);
  setText(elements.variantValue, variant);
  setText(elements.supplyValue, `${formatUnits(totalSupplyRaw, tokenDecimals)} ${tokenSymbol}`);
  setText(elements.capValue, `${formatUnits(supplyCapRaw, tokenDecimals)} ${tokenSymbol}`);
  setText(elements.contractUriValue, String(contractURI));
  await refreshLoadedBalance();
  log(`Loaded B20 token ${tokenSymbol} at ${token}`);
  updateWorkflow();
}

async function refreshLoadedBalance(): Promise<void> {
  if (!state.token || !state.account || state.tokenDecimals === undefined) {
    return;
  }

  const balance = await getPublicClient().readContract({
    address: state.token,
    abi: B20_FULL_ABI,
    functionName: "balanceOf",
    args: [state.account],
  });
  setText(elements.balanceValue, `${formatUnits(balance, state.tokenDecimals)} ${getActiveSymbol()}`);
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
  state.tokenDecimals = form.decimals;
  state.tokenSymbol = form.symbol.trim();
  elements.manualTokenAddress.value = predictedToken;
  setText(elements.tokenValue, predictedToken);
  elements.mintToken.disabled = false;
  log(`B20 token deployed at ${predictedToken}`);
  await loadTokenDetails(predictedToken);
}

async function mintToken(): Promise<void> {
  if (!state.token || !state.account) {
    throw new Error("Deploy a token first.");
  }
  if (state.provider) {
    await ensureBaseSepolia(state.provider);
  }

  const walletClient = getWalletClient();
  const decimals = getActiveDecimals();
  const amount = parseTokenAmount(elements.mintAmount.value, decimals);
  if (amount <= 0n) {
    throw new Error("Mint amount must be greater than zero.");
  }
  const issuanceMemo = createMemo({
    namespace: "MINT",
    reference: elements.issuanceReference.value,
  });
  setText(elements.issuanceMemoValue, issuanceMemo.memoBytes32);
  setText(elements.issuancePayloadValue, issuanceMemo.canonicalPayload);
  const mintData = encodeFunctionData({
    abi: B20_FULL_ABI,
    functionName: "mintWithMemo",
    args: [state.account, amount, issuanceMemo.memoBytes32],
  });
  const gas = await estimateContractGasWithBuffer({
    account: state.account,
    to: state.token,
    data: mintData,
  });

  log("Waiting for wallet signature to mint with memo...");
  const hash = await walletClient.writeContract({
    address: state.token,
    abi: B20_FULL_ABI,
    functionName: "mintWithMemo",
    args: [state.account, amount, issuanceMemo.memoBytes32],
    account: state.account,
    chain: baseSepolia,
    gas,
  });

  log(`Mint transaction sent: ${hash}`);
  await getPublicClient().waitForTransactionReceipt({ hash });

  const balance = await getPublicClient().readContract({
    address: state.token,
    abi: B20_FULL_ABI,
    functionName: "balanceOf",
    args: [state.account],
  });
  setText(elements.balanceValue, `${formatUnits(balance, decimals)} ${getActiveSymbol()}`);
  log(`Mint with memo confirmed. Balance: ${formatUnits(balance, decimals)}`);
}

function buildMemoPreview(): MemoRecord {
  if (!isTransferMemoNamespace(elements.memoNamespace.value)) {
    throw new Error("Transfer/redeem can only use PAYMENT or REDEEM memo namespaces in this UI.");
  }
  const memo = createMemo({
    namespace: elements.memoNamespace.value,
    reference: elements.memoReference.value,
  });
  state.memo = memo;
  state.receiptChecked = false;
  setText(elements.memoValue, memo.memoBytes32);
  setText(elements.memoPayloadValue, memo.canonicalPayload);
  setText(elements.intentStatusValue, "memo ready");
  updateWorkflow();
  return memo;
}

async function previewMemo(): Promise<void> {
  const memo = buildMemoPreview();
  log(`Memo preview: ${memo.memoBytes32} (${memo.canonicalPayload})`);
}

async function sendMemoPayment(): Promise<void> {
  if (!state.token) {
    throw new Error("Load or deploy a B20 token first.");
  }
  if (!state.account || !state.provider) {
    throw new Error("Connect a wallet first.");
  }
  await ensureBaseSepolia(state.provider);

  const recipient = elements.paymentRecipient.value.trim();
  if (!isAddress(recipient)) {
    throw new Error("Payment recipient must be a valid EVM address.");
  }

  if (state.tokenDecimals === undefined) {
    await loadTokenDetails(state.token);
  }
  const decimals = getActiveDecimals();
  const amount = parseTokenAmount(elements.paymentAmount.value, decimals);
  if (amount <= 0n) {
    throw new Error("Payment amount must be greater than zero.");
  }
  const memo = buildMemoPreview();
  const walletClient = getWalletClient();
  const transferData = encodeFunctionData({
    abi: B20_FULL_ABI,
    functionName: "transferWithMemo",
    args: [recipient, amount, memo.memoBytes32],
  });
  const gas = await estimateContractGasWithBuffer({
    account: state.account,
    to: state.token,
    data: transferData,
  });

  log("Waiting for wallet signature to transfer with memo...");
  const hash = await walletClient.writeContract({
    address: state.token,
    abi: B20_FULL_ABI,
    functionName: "transferWithMemo",
    args: [recipient, amount, memo.memoBytes32],
    account: state.account,
    chain: baseSepolia,
    gas,
  });

  log(`Memo payment transaction sent: ${hash}`);
  setText(elements.intentStatusValue, "confirming");
  const receipt = await getPublicClient().waitForTransactionReceipt({ hash });
  elements.receiptHash.value = receipt.transactionHash;
  await refreshLoadedBalance();
  setText(elements.intentStatusValue, "confirmed");
  log(`Memo payment confirmed in block ${receipt.blockNumber.toString()}.`);
}

async function refreshStatus(): Promise<void> {
  if (!state.token) {
    throw new Error("Load or deploy a B20 token first.");
  }
  const publicClient = getPublicClient();
  const roleChecks = [
    ["MINT", B20_ROLES.MINT_ROLE],
    ["BURN", B20_ROLES.BURN_ROLE],
    ["BURN_BLOCKED", B20_ROLES.BURN_BLOCKED_ROLE],
    ["PAUSE", B20_ROLES.PAUSE_ROLE],
    ["UNPAUSE", B20_ROLES.UNPAUSE_ROLE],
    ["METADATA", B20_ROLES.METADATA_ROLE],
    ["OPERATOR", B20_ROLES.OPERATOR_ROLE],
  ] as const;
  const policyChecks = [
    ["sender", B20_POLICY_SCOPES.TRANSFER_SENDER_POLICY],
    ["receiver", B20_POLICY_SCOPES.TRANSFER_RECEIVER_POLICY],
    ["executor", B20_POLICY_SCOPES.TRANSFER_EXECUTOR_POLICY],
    ["mintReceiver", B20_POLICY_SCOPES.MINT_RECEIVER_POLICY],
  ] as const;

  if (state.account) {
    const roleResults = await Promise.all(
      roleChecks.map(async ([label, role]) => {
        const hasRole = await publicClient.readContract({
          address: state.token!,
          abi: B20_FULL_ABI,
          functionName: "hasRole",
          args: [role, state.account!],
        });
        return [label, Boolean(hasRole)] as const;
      }),
    );
    setText(
      elements.rolesValue,
      formatRoleSummary(roleResults.filter(([, active]) => active).map(([label]) => label)),
    );
  } else {
    setText(elements.rolesValue, "connect wallet to check roles");
  }

  const policies = await Promise.all(
    policyChecks.map(async ([label, scope]) => {
      const policyId = await publicClient.readContract({
        address: state.token!,
        abi: B20_FULL_ABI,
        functionName: "policyId",
        args: [scope],
      });
      return [label, BigInt(policyId)] as const;
    }),
  );
  const pausedFeatures = await publicClient.readContract({
    address: state.token,
    abi: B20_FULL_ABI,
    functionName: "pausedFeatures",
  });
  setText(elements.policiesValue, formatPolicySummary(policies));
  setText(elements.pausedValue, formatPausedFeatures(pausedFeatures));
  log("Refreshed B20 roles, policy IDs, and paused features.");
}

async function reconcileReceipt(): Promise<void> {
  const hash = elements.receiptHash.value.trim();
  if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) {
    throw new Error("Transaction hash must be a 32-byte hex value.");
  }

  const receipt = await getPublicClient().getTransactionReceipt({ hash: hash as Hex });
  const logs: B20RawLog[] = receipt.logs.map((entry) => ({
    address: entry.address,
    transactionHash: receipt.transactionHash,
    logIndex: entry.logIndex,
    blockNumber: receipt.blockNumber,
    blockHash: receipt.blockHash,
    topics: entry.topics,
    data: entry.data,
  }));
  const pairs = pairMemoTransfers(logs);
  state.receiptChecked = true;
  updateWorkflow();
  if (pairs.length === 0) {
    elements.receiptValue.textContent = "No adjacent B20 Transfer/Memo pairs found.";
    setText(elements.intentStatusValue, "receipt checked");
    return;
  }

  const expectation = buildPaymentExpectation();
  elements.receiptValue.textContent = pairs
    .map((pair, index) => {
      const baseLine = [
        `#${index + 1}`,
        pair.kind,
        pair.tokenAddress,
        `from ${pair.fromAddress}`,
        `to ${pair.toAddress}`,
        `amount ${pair.amountRaw.toString()}`,
        `memo ${pair.memoBytes32}`,
        `logs ${pair.primaryLogIndex}/${pair.memoLogIndex}`,
      ].join("\n");
      if (!expectation) {
        return baseLine;
      }
      const validation = validatePaymentPair(pair, expectation);
      return `${baseLine}\nvalidation: ${validation.ok ? "ok" : validation.reason}`;
    })
    .join("\n\n");
  setText(elements.intentStatusValue, "reconciled");
  log(`Receipt check found ${pairs.length} adjacent Transfer/Memo pair${pairs.length === 1 ? "" : "s"}.`);
}

function buildPaymentExpectation() {
  if (!state.token || state.tokenDecimals === undefined) {
    return undefined;
  }
  const recipient = elements.paymentRecipient.value.trim();
  if (!isAddress(recipient)) {
    return undefined;
  }
  try {
    const memo = state.memo ?? buildMemoPreview();
    return {
      token: state.token,
      merchant: recipient,
      expectedAmountRaw: parseTokenAmount(elements.paymentAmount.value, state.tokenDecimals),
      memoBytes32: memo.memoBytes32,
    };
  } catch {
    return undefined;
  }
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
  updateWorkflow();
});
elements.salt.addEventListener("input", clearTokenSelection);
elements.mintAmount.addEventListener("input", resetIssuanceMemo);
elements.issuanceReference.addEventListener("input", resetIssuanceMemo);
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
bindAction(elements.loadToken, async () => {
  await loadTokenDetails();
});
bindAction(elements.previewMemo, previewMemo);
bindAction(elements.sendMemoPayment, sendMemoPayment);
bindAction(elements.refreshStatus, refreshStatus);
bindAction(elements.reconcileReceipt, reconcileReceipt);
elements.useSelfRecipient.addEventListener("click", () => {
  if (!state.account) {
    log("Error: Connect a wallet first.");
    return;
  }
  elements.paymentRecipient.value = state.account;
  resetPaymentDraft();
  log("Payment recipient set to the connected wallet.");
});
elements.memoNamespace.addEventListener("change", resetPaymentDraft);
for (const input of [elements.memoReference, elements.paymentRecipient, elements.paymentAmount]) {
  input.addEventListener("input", resetPaymentDraft);
}
renderTestFlow();
updateWorkflow();
