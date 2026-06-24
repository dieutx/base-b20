# Security Notes

The preferred deployment path is the browser wallet app:

- Open the Codespaces forwarded URL in your normal browser.
- Connect MetaMask, OKX, or another injected wallet.
- Sign deploy and mint transactions in the wallet.
- Do not paste a private key into Codespaces for this path.

Use the CLI fallback only when you intentionally want a private-key workflow. If you do:

- Use a dedicated deploy wallet, not your main wallet.
- Keep the real private key only in untracked `.env`.
- Confirm `.env` is ignored before adding files to git.
- Fund the deploy wallet with only the ETH needed for the deployment.
- Rotate or abandon the deploy wallet if the key is ever pasted into the wrong place.

Never commit:

- `.env`
- private keys
- mnemonic phrases
- Chainstack endpoints intended to be private
- broadcast files containing sensitive deployment metadata
