# B20 Local Development

## Install

```bash
npm install
```

Install Base Foundry separately:

```bash
curl -L https://raw.githubusercontent.com/base/base-anvil/HEAD/foundryup/install | bash
base-foundryup
npm run b20:install
```

## Build And Test

```bash
npm run build
npm test
```

When `base-forge` is available:

```bash
npm run b20:build
npm run b20:test
```

Standard `forge` is not enough for live B20 precompile simulation. Use `base-forge`, `base-cast`, and `base-anvil`.

## Run The Browser App

```bash
npm run dev
```

Open the forwarded Vite URL in a real browser with MetaMask or OKX. Do not put a production private key in Codespaces.
