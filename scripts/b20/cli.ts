import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { createPublicClient, http, isHex, type Hex } from "viem";

import { ACTIVATION_REGISTRY_ABI, B20_FACTORY_ABI } from "../../src/b20ops/abi.ts";
import { normalizeB20Config, type B20ConfigInput } from "../../src/b20ops/config.ts";
import { ACTIVATION_REGISTRY_ADDRESS, B20_FACTORY_ADDRESS } from "../../src/b20ops/constants.ts";
import { createDeploymentPlan } from "../../src/b20ops/deploymentPlan.ts";

const [command, configPath] = process.argv.slice(2);
if (!command || !configPath) {
  throw new Error("Usage: node --experimental-strip-types scripts/b20/cli.ts <plan|preflight|env> <config.json>");
}

const rawConfig = JSON.parse(expandEnv(readFileSync(configPath, "utf8"))) as B20ConfigInput;
const config = normalizeB20Config(rawConfig);

if (command === "env") {
  printShellEnv(config);
} else if (command === "plan") {
  const deployer = process.env.DEPLOYER_ADDRESS ?? config.roles.admin;
  const plan = createDeploymentPlan(config, deployer);
  const output = `deployments/b20/${plan.chainId}/${config.token.symbol}.plan.json`;
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${json(plan)}\n`);
  console.log(`B20 deployment plan written to ${output}`);
  console.log(`Predicted address: ${plan.predictedAddress}`);
  console.log(`Config digest: ${plan.configDigest}`);
} else if (command === "preflight") {
  const publicClient = createPublicClient({ transport: http(config.network.rpcUrl) });
  const chainId = await publicClient.getChainId();
  if (chainId !== config.network.chainId) {
    throw new Error(`RPC chain mismatch: expected ${config.network.chainId}, got ${chainId}`);
  }
  await publicClient.readContract({
    address: B20_FACTORY_ADDRESS,
    abi: B20_FACTORY_ABI,
    functionName: "getB20Address",
    args: [config.token.variant === "asset" ? 0 : 1, config.roles.admin, config.token.saltHash],
  });
  const feature = process.env.B20_FEATURE_ID;
  if (feature) {
    if (!isHex(feature)) {
      throw new Error("B20_FEATURE_ID must be bytes32 hex when provided.");
    }
    const activated = await publicClient.readContract({
      address: ACTIVATION_REGISTRY_ADDRESS,
      abi: ACTIVATION_REGISTRY_ABI,
      functionName: "isActivated",
      args: [feature as Hex],
    });
    if (!activated) {
      throw new Error(`B20 feature ${feature} is not active on ${config.network.name}.`);
    }
  }
  console.log(`Preflight OK for ${config.network.name} (${chainId}), variant=${config.token.variant}`);
} else {
  throw new Error(`Unknown B20 CLI command: ${command}`);
}

function expandEnv(input: string): string {
  return input.replace(/\$\{([A-Z0-9_]+)\}/g, (_, name: string) => {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Missing environment variable ${name}`);
    }
    return value;
  });
}

function json(value: unknown): string {
  return JSON.stringify(
    value,
    (_, item: unknown) => (typeof item === "bigint" ? item.toString() : item),
    2,
  );
}

function printShellEnv(configToPrint: ReturnType<typeof normalizeB20Config>): void {
  const token = configToPrint.token;
  const rows: Record<string, string> = {
    RPC_URL: configToPrint.network.rpcUrl,
    CHAIN_ID: String(configToPrint.network.chainId),
    B20_VARIANT: token.variant,
    B20_NAME: token.name,
    B20_SYMBOL: token.symbol,
    B20_SALT: token.salt,
    B20_SUPPLY_CAP_RAW: token.supplyCapRaw.toString(),
    B20_CONTRACT_URI: token.contractURI,
    B20_ADMIN: configToPrint.roles.admin,
    B20_MINTER: configToPrint.roles.minter,
    B20_BURNER: configToPrint.roles.burner,
    B20_BURN_BLOCKED: configToPrint.roles.burnBlocked,
    B20_PAUSER: configToPrint.roles.pauser,
    B20_UNPAUSER: configToPrint.roles.unpauser,
    B20_METADATA: configToPrint.roles.metadata,
    B20_POLICY_ADMIN: configToPrint.roles.policyAdmin,
  };
  if (token.variant === "asset") {
    rows.B20_DECIMALS = String(token.decimals);
    rows.B20_OPERATOR = configToPrint.roles.operator ?? "";
  } else {
    rows.B20_CURRENCY = token.currency;
  }
  for (const [key, value] of Object.entries(rows)) {
    console.log(`export ${key}=${shellQuote(value)}`);
  }
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}
