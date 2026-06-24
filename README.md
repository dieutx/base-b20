# Base B20 Wallet Deployer

Repo này giúp deploy B20 token trên Base bằng GitHub Codespaces và ví trình duyệt như MetaMask hoặc OKX.

Luồng khuyến nghị không cần private key trong Codespaces. Bạn mở app từ forwarded URL, kết nối ví, ký giao dịch deploy/mint trong ví.

Nguồn tham khảo:

- Base: https://docs.base.org/get-started/launch-b20-token
- Chainstack: https://docs.chainstack.com/docs/base-tutorial-deploy-a-b20-token
- Base std library: https://github.com/base/base-std

## Token mặc định

- Name: `DieuTX B20`
- Symbol: `DIEUTX`
- Network: Base Sepolia
- Decimals: `18`
- Supply cap: `1,000,000`
- Initial mint gợi ý: `1,000`

Bạn có thể sửa trực tiếp trong web app trước khi deploy.

## Tạo private repo `dieutx/base-b20`

Nếu repo chưa tồn tại:

1. Vào GitHub, chọn **New repository**.
2. Owner: `dieutx`.
3. Repository name: `base-b20`.
4. Chọn **Private**.
5. Tạo repo rỗng, không cần README mặc định.

Sau đó từ máy có source repo này:

```bash
git remote add origin https://github.com/dieutx/base-b20.git
git push -u origin main
```

## Chạy bằng GitHub Codespaces

1. Mở repo `dieutx/base-b20` trên GitHub.
2. Chọn **Code** -> **Codespaces** -> **Create codespace on main**.
3. Trong terminal Codespaces, chạy:

```bash
npm install
npm run dev
```

4. Mở tab **Ports**, tìm port `5173`, chọn **Open in Browser**.
5. Dùng browser thật có extension ví, ví dụ Chrome/Brave với MetaMask hoặc OKX.

Không dùng IDE Simple Browser nếu ví không hiện. Wallet extension thường chỉ inject provider vào browser thật.

## Deploy bằng MetaMask hoặc OKX

1. Cấp Base Sepolia ETH testnet cho ví deploy.
2. Trong app, chọn ví trong dropdown.
3. Bấm **Connect wallet**.
4. Bấm **Switch Base Sepolia**.
5. Kiểm tra token name, symbol, decimals, supply cap, initial mint và salt.
6. Bấm **Preview address** để xem địa chỉ token dự kiến.
7. Bấm **Deploy B20** và ký giao dịch trong ví.
8. Sau khi deploy xong, bấm **Mint** và ký giao dịch mint.
9. App sẽ đọc `balanceOf` để xác nhận balance.

Nếu gặp lỗi token đã tồn tại, đổi giá trị **Salt** rồi preview/deploy lại.

## Dùng Chainstack RPC

Web app dùng public Base Sepolia RPC mặc định:

```text
https://sepolia.base.org
```

Nếu muốn dùng Chainstack endpoint riêng, sửa `BASE_SEPOLIA_RPC_URL` trong `src/main.ts`, rồi chạy lại:

```bash
npm run dev
```

Không commit endpoint riêng nếu bạn xem nó là credential.

## CLI fallback với Base Foundry

Luồng này chỉ dành cho trường hợp bạn muốn deploy bằng terminal/private key. Cách ví ở trên an toàn hơn cho Codespaces vì không cần private key.

Cài Base Foundry:

```bash
curl -L https://raw.githubusercontent.com/base/base-anvil/HEAD/foundryup/install | bash
base-foundryup --install v1.1.0
```

Cài Base std:

```bash
base-forge install base/base-std --no-git
```

Tạo `.env` cục bộ:

```bash
cp .env.example .env
```

Mở `.env`, điền:

- `RPC_URL`
- `ACCOUNT_ADDRESS`
- `PRIVATE_KEY`

Không commit `.env`.

Kiểm tra ví có ETH testnet:

```bash
source .env
base-cast balance "$ACCOUNT_ADDRESS" --rpc-url "$RPC_URL"
```

Deploy:

```bash
source .env
base-forge script script/CreateToken.s.sol --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --broadcast
```

Lấy token address từ broadcast artifact:

```bash
TOKEN_ADDRESS=$(jq -er '.returns.token.value' "broadcast/CreateToken.s.sol/$CHAIN_ID/run-latest.json")
echo "export TOKEN_ADDRESS=$TOKEN_ADDRESS" >> .env
echo "$TOKEN_ADDRESS"
```

Mint bằng CLI:

```bash
source .env
base-cast send "$TOKEN_ADDRESS" "mint(address,uint256)" "$ACCOUNT_ADDRESS" 1000000000000000000000 \
  --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY"
```

Verify balance:

```bash
base-cast call "$TOKEN_ADDRESS" "balanceOf(address)(uint256)" "$ACCOUNT_ADDRESS" --rpc-url "$RPC_URL"
```

## Security checklist

- Không commit `.env`.
- Không paste seed phrase vào Codespaces.
- Không dùng ví chính để deploy thử nghiệm.
- Không commit private RPC endpoint nếu endpoint đó cần giữ kín.
- Dùng browser wallet flow nếu mục tiêu là deploy từ Codespaces mà không lộ private key.

Đọc thêm: [docs/security.md](docs/security.md).
