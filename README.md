# Base B20 Wallet Deployer

Deploy a Base B20 token from GitHub Codespaces using a browser wallet. The app defaults to MetaMask when it is available, but OKX and other injected wallets also work.

No private key is needed in Codespaces.

## Editable Defaults

These values are only defaults. Change them in the app before deploying.

- Name: `DieuTX B20`
- Symbol: `DIEUTX`
- Network: Base Sepolia
- Decimals: `18`
- Supply cap: `1,000,000`
- Initial mint: `1,000`
- Salt: `dieutx-b20-v1`

Change the salt when creating a new token with the same wallet on the same network.

## Quick Start

1. Open `https://github.com/dieutx/base-b20`.
2. Click **Code** -> **Codespaces** -> **Create codespace on main**.
3. In the Codespaces terminal:

```bash
npm install
npm run dev
```

4. Open **Ports** -> `5173` -> **Open in Browser**.
5. Use a real browser with MetaMask installed. Do not use the IDE Simple Browser.
6. In the app:
   - keep MetaMask selected, or choose another wallet
   - click **Connect wallet**
   - click **Add/Switch Base Sepolia**
   - edit token fields if needed
   - click **Preview address**
   - click **Deploy B20** and sign in the wallet
   - click **Mint** if you want the initial mint

Your wallet needs Base Sepolia ETH for gas.

## RPC Troubleshooting

If MetaMask shows `Requested resource not available` or `RPC endpoint returned too many errors`:

1. Paste a reliable Base Sepolia RPC into **Base Sepolia RPC URL**.
2. Click **Add/Switch Base Sepolia** again.
3. If MetaMask still uses a broken RPC, open MetaMask network settings and update the Base Sepolia RPC there.

The app can ask the wallet to add or switch networks. It cannot force MetaMask or OKX to replace an RPC URL that is already saved in the wallet.

Public default:

```text
https://sepolia.base.org
```

A Chainstack Base Sepolia endpoint can also be used.

## CLI Fallback

Only use this if you intentionally want a private-key workflow.

```bash
curl -L https://raw.githubusercontent.com/base/base-anvil/HEAD/foundryup/install | bash
base-foundryup --install v1.1.0
base-forge install base/base-std --no-git
cp .env.example .env
```

Fill `.env`, then:

```bash
source .env
base-cast balance "$ACCOUNT_ADDRESS" --rpc-url "$RPC_URL"
base-forge script script/CreateToken.s.sol --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --broadcast
```

Never commit `.env`, private keys, seed phrases, or private RPC credentials.

## References

- Base B20 guide: https://docs.base.org/get-started/launch-b20-token
- Chainstack guide: https://docs.chainstack.com/docs/base-tutorial-deploy-a-b20-token
- Base standard library: https://github.com/base/base-std
