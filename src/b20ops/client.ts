import type { Address, Hex } from "viem";

import { B20_ABI, B20_FACTORY_ABI, POLICY_REGISTRY_ABI } from "./abi.ts";
import { B20_FACTORY_ADDRESS, POLICY_REGISTRY_ADDRESS } from "./constants.ts";
import { decodeB20Error, type DecodedB20Error } from "./errors.ts";

type ReadContractArgs = {
  address: Address;
  abi: typeof B20_ABI | typeof B20_FACTORY_ABI | typeof POLICY_REGISTRY_ABI;
  functionName: string;
  args?: readonly unknown[];
};

type WriteContractArgs = ReadContractArgs & {
  account?: Address;
};

export type B20PublicClient = {
  readContract(args: ReadContractArgs): Promise<unknown>;
  simulateContract?(args: WriteContractArgs): Promise<unknown>;
};

export type B20WalletClient = {
  writeContract(args: WriteContractArgs): Promise<Hex>;
};

export type B20Client = {
  readIdentity(): Promise<{
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: bigint;
    supplyCap: bigint;
    contractURI: string;
  }>;
  readFactoryState(deployer: Address, salt: Hex, variant: 0 | 1): Promise<{ predicted: Address; isB20: boolean; initialized: boolean }>;
  readPolicy(scope: Hex): Promise<bigint>;
  previewPolicyAuthorization(policyId: bigint, account: Address): Promise<boolean>;
  transferWithMemo(to: Address, amountRaw: bigint, memo: Hex): Promise<{ ok: true; hash: Hex } | { ok: false; error: DecodedB20Error }>;
  approve(spender: Address, amountRaw: bigint): Promise<{ ok: true; hash: Hex } | { ok: false; error: DecodedB20Error }>;
};

export function createB20Client(input: {
  tokenAddress: Address;
  publicClient: B20PublicClient;
  walletClient?: B20WalletClient;
  account?: Address;
}): B20Client {
  const { tokenAddress, publicClient, walletClient, account } = input;

  return {
    async readIdentity() {
      const [name, symbol, decimals, totalSupply, supplyCap, contractURI] = await Promise.all([
        publicClient.readContract({ address: tokenAddress, abi: B20_ABI, functionName: "name" }),
        publicClient.readContract({ address: tokenAddress, abi: B20_ABI, functionName: "symbol" }),
        publicClient.readContract({ address: tokenAddress, abi: B20_ABI, functionName: "decimals" }),
        publicClient.readContract({ address: tokenAddress, abi: B20_ABI, functionName: "totalSupply" }),
        publicClient.readContract({ address: tokenAddress, abi: B20_ABI, functionName: "supplyCap" }),
        publicClient.readContract({ address: tokenAddress, abi: B20_ABI, functionName: "contractURI" }),
      ]);
      return {
        name: String(name),
        symbol: String(symbol),
        decimals: Number(decimals),
        totalSupply: BigInt(totalSupply as bigint),
        supplyCap: BigInt(supplyCap as bigint),
        contractURI: String(contractURI),
      };
    },

    async readFactoryState(deployer, salt, variant) {
      const predicted = (await publicClient.readContract({
        address: B20_FACTORY_ADDRESS,
        abi: B20_FACTORY_ABI,
        functionName: "getB20Address",
        args: [variant, deployer, salt],
      })) as Address;
      const [isB20, initialized] = await Promise.all([
        publicClient.readContract({ address: B20_FACTORY_ADDRESS, abi: B20_FACTORY_ABI, functionName: "isB20", args: [predicted] }),
        publicClient.readContract({
          address: B20_FACTORY_ADDRESS,
          abi: B20_FACTORY_ABI,
          functionName: "isB20Initialized",
          args: [predicted],
        }),
      ]);
      return { predicted, isB20: Boolean(isB20), initialized: Boolean(initialized) };
    },

    async readPolicy(scope) {
      return BigInt(
        (await publicClient.readContract({ address: tokenAddress, abi: B20_ABI, functionName: "policyId", args: [scope] })) as bigint,
      );
    },

    async previewPolicyAuthorization(policyId, accountToCheck) {
      const exists = await publicClient.readContract({
        address: POLICY_REGISTRY_ADDRESS,
        abi: POLICY_REGISTRY_ABI,
        functionName: "policyExists",
        args: [policyId],
      });
      if (!exists) {
        throw new Error(`Policy ${policyId.toString()} does not exist.`);
      }
      return Boolean(
        await publicClient.readContract({
          address: POLICY_REGISTRY_ADDRESS,
          abi: POLICY_REGISTRY_ABI,
          functionName: "isAuthorized",
          args: [policyId, accountToCheck],
        }),
      );
    },

    async transferWithMemo(to, amountRaw, memo) {
      return writeWithSimulation(publicClient, walletClient, account, {
        address: tokenAddress,
        abi: B20_ABI,
        functionName: "transferWithMemo",
        args: [to, amountRaw, memo],
      });
    },

    async approve(spender, amountRaw) {
      return writeWithSimulation(publicClient, walletClient, account, {
        address: tokenAddress,
        abi: B20_ABI,
        functionName: "approve",
        args: [spender, amountRaw],
      });
    },
  };
}

async function writeWithSimulation(
  publicClient: B20PublicClient,
  walletClient: B20WalletClient | undefined,
  account: Address | undefined,
  request: WriteContractArgs,
): Promise<{ ok: true; hash: Hex } | { ok: false; error: DecodedB20Error }> {
  if (!walletClient || !account) {
    return { ok: false, error: { code: "UNKNOWN", message: "Wallet client and account are required for writes." } };
  }
  try {
    if (publicClient.simulateContract) {
      await publicClient.simulateContract({ ...request, account });
    }
    const hash = await walletClient.writeContract({ ...request, account });
    return { ok: true, hash };
  } catch (error) {
    return { ok: false, error: decodeB20Error(error) };
  }
}
