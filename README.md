# Silksuite DEX Programmatic Trading Client

A JavaScript-based trading client for sniping and trading tokens on the **Silksuite DEX** using the **Hedera Testnet/Mainnet**. This tool provides an interactive shell interface for wallet management and programmatic swaps via RESTful APIs and WebSockets.

## 🎯 Features

- ✅ **Interactive Shell Entrypoint** — `trade.sh` prompts for Account ID and Private Key
- ✅ **Wallet Validation** — Verifies Account ID balance against Hedera Mirror Node
- ✅ **Public Key Derivation** — Derives public key from private key and validates matching balances
- ✅ **Token Sniping** — Programmatically swap tokens on Silksuite DEX via Smart Nodes
- ✅ **REST & WebSocket Support** — Uses REST APIs and socket.io for real-time trading
- ✅ **Smart Node Connectivity Check** — Diagnostic tool to test node health
- ✅ **Cross-Platform Support** — Works on Windows (PowerShell), Linux/Mac, and Android (Termius)

## 📋 Prerequisites

- **Node.js** v14+ (download from [nodejs.org](https://nodejs.org))
- **Git** (optional, for cloning)
- **Hedera Account** with HBAR balance (testnet or mainnet)
- **Internet Connection** (to connect to Hedera Mirror Node and Smart Nodes)

## 🚀 Quick Start

### Option 1: Linux/macOS Terminal

```bash
# Clone the repository
git clone https://github.com/timedbase/Siilksuite-HTS.git
cd Siilksuite-HTS

# Install dependencies
npm install

# Run the trading client
./trade.sh
```

### Option 2: Windows PowerShell

```powershell
# Clone the repository
git clone https://github.com/timedbase/Siilksuite-HTS.git
cd Siilksuite-HTS

# Install dependencies
npm install

# Run the trading client (use Node directly)
node src/trade.js --network mainnet
```

For interactive mode with prompts on Windows, use Windows Subsystem for Linux (WSL):
```powershell
wsl ./trade.sh
```

### Option 3: Android Terminal (Termius)

1. **Install Termius** from Google Play Store
2. **Enable SSH Key** — Create or import your SSH key in Termius settings
3. **Add New Host**:
   - Hostname: Your server IP (or use local development)
   - Port: 22
   - Auth: SSH Key
4. **Connect & Clone Repository**:
   ```bash
   git clone https://github.com/timedbase/Siilksuite-HTS.git
   cd Siilksuite-HTS
   npm install
   ./trade.sh
   ```

**Tip**: For better mobile experience, use a lightweight Linux SSH server or develop locally and deploy to a cloud server (DigitalOcean, Linode, AWS).

## 📖 Usage Guide

### Step 1: Wallet Credential Validation

When you run `./trade.sh`, the script will prompt for:

```
Hedera account ID (e.g. 0.0.123456): 
Private key (hidden): 
```

**The script performs the following validation**:
- ✅ Parses the private key using Hedera SDK
- ✅ Derives your **public key** from the private key
- ✅ Queries Hedera Mirror Node for Account balance
- ✅ Verifies that both Account ID and Public Key have **matching HBAR balances**
- ✅ If validation passes, displays your balance and proceeds to token configuration
- ❌ If validation fails, asks you to re-enter your credentials

Example output:
```
==========================================
Step 1: Validating Wallet Credentials
==========================================
📍 Account ID: 0.0.123456
📍 Public Key (derived): 302e020100300506032b6570042204203a...
💰 HBAR Balance: 10.50000000 HBAR
✅ Credentials validated
```

### Step 2: Configure Swap Parameters

After wallet validation, enter:

```
Base token (HBAR or token id e.g. 0.0.786931) [0.0.786931]: 
Swap token (HBAR or token id e.g. 0.0.786931) [HBAR]: 
Amount to spend (HBAR): 
```

**Supported Token Formats**:
- `HBAR` — Hedera's native token
- `0.0.123456` — Hedera token ID format

### Step 3: Execute Swap

Once parameters are set, the trading engine:
1. Connects to available Smart Nodes via WebSocket
2. Requests an unsigned swap transaction
3. Signs the transaction locally with your private key
4. Submits the signed transaction for execution
5. Displays transaction receipt and status

## 🔧 Advanced Usage

### Run with Command-Line Arguments

```bash
./trade.sh \
  --account 0.0.123456 \
  --key "302e020100300506032b6570042204203a..." \
  --base-token 0.0.786931 \
  --base-amount 5000 \
  --swap-token HBAR \
  --debug
```

**Options**:
- `-a, --account` — Hedera account ID
- `-k, --key` — Private key (DER format)
- `-b, --base-token` — Token to spend (default: 0.0.786931)
- `-A, --base-amount` — Amount to spend (required)
- `-s, --swap-token` — Token to receive (default: HBAR)
- `-d, --debug` — Keep process alive after run for debugging
- `-h, --help` — Show help message

### Test Smart Node Connectivity

```bash
npm run test-nodes
```

This will verify HTTP, WebSocket, and Mirror Node connectivity to all available Smart Nodes:

```
📍 Testing https://mainnet-sn1.hbarsuite.network (0.0.1786597)
────────────────────────────────────────────────────────────
  [1/3] HTTP GET /pools/list...
    ✅ HTTP OK (status 200)
  [2/3] WebSocket to wss://... /gateway
    ✅ WebSocket OK (connected)
  [3/3] Mirror Node /api/v1/accounts/0.0.1
    ✅ Mirror Node OK (status 200)
```

### Run Swap Engine Directly (Advanced)

```bash
MAINNET_OPERATOR_ID="0.0.123456" \
MAINNET_OPERATOR_PRIVATE_KEY="302e..." \
BASE_TOKEN="0.0.786931" \
BASE_AMOUNT="5000" \
SWAP_TOKEN="HBAR" \
node src/trade.js --network mainnet
```

## 📁 Project Structure

```
Siilksuite-HTS/
├── trade.sh                    # Interactive shell entrypoint
├── src/
│   └── trade.js               # Node.js swap engine (core logic)
├── scripts/
│   └── test-nodes.js          # Smart Node connectivity diagnostic
├── package.json               # Dependencies
├── README.md                  # This file
└── LICENSE                    # OpenGL3 License
```

## 🔐 Security Best Practices

- ⚠️ **NEVER** commit your private keys to git or share them
- ⚠️ **NEVER** paste your private key into public chats or forums
- ⚠️ **ALWAYS** use MAINNET carefully — start with small amounts
- ⚠️ **ALWAYS** verify Smart Node connectivity before trading
- ✅ **DO** use a hardware wallet for production accounts
- ✅ **DO** test on TESTNET first before using MAINNET
- ✅ **DO** keep your system and dependencies updated

## 🛠️ Troubleshooting

### Problem: "Invalid credentials"

**Solution**: Verify your Account ID and Private Key format:
```bash
# Account ID should be: 0.0.123456
# Private Key should be in DER format starting with: 302e...
```

### Problem: "Could not fetch balance from Hedera Mirror Node"

**Solution**: Check your internet connection and try again:
```bash
npm run test-nodes
```

### Problem: "WebSocket connection timeout"

**Solution**: Smart Nodes may be under maintenance. Check node status:
```bash
npm run test-nodes
```

If all nodes fail, wait a moment and retry. You can check Silksuite network status at [hbarsuite.network](https://hbarsuite.network).

### Problem: Transaction fails with "Insufficient balance"

**Solution**: Ensure your account has enough HBAR for:
- Swap amount
- Transaction fees (~0.1 HBAR per transaction)

## 📚 Architecture Overview

```
User (Terminal)
    ↓
./trade.sh (Interactive Shell)
    ├── Prompts for Account ID & Private Key
    ├── Validates credentials via Mirror Node
    └── Passes to Node.js engine
         ↓
    src/trade.js (Core Trading Engine)
    ├── Connects to Smart Node via WebSocket
    ├── Requests unsigned swap transaction
    ├── Signs locally with Private Key
    ├── Submits signed transaction
    └── Returns receipt & status
         ↓
    Hedera Testnet/Mainnet (Block Settlement)
```

## 🔗 References

- [Hedera SDK for JavaScript](https://github.com/hashgraph/hedera-sdk-js)
- [Hedera Mirror Node API](https://docs.hedera.com/hedera/sdks-and-apis/rest-api)
- [Silksuite DEX Documentation](https://hbarsuite.network)
- [Socket.IO Documentation](https://socket.io/docs/)
- [OpenGL3 License](./LICENSE)

## 📝 License

This project is licensed under the **OpenGL3 License** — see [LICENSE](./LICENSE) file for details.

## 🤝 Contributing

Contributions welcome! Please:
1. Fork this repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## ⚠️ Disclaimer

This software is provided "as-is" without warranty. Users are responsible for:
- Understanding the risks of trading on decentralized exchanges
- Securely managing their private keys and credentials
- Complying with applicable laws and regulations
- Testing thoroughly before using real funds

**ALWAYS TEST ON TESTNET FIRST** before using MAINNET.

---

**Version**: 1.0.0  
**Last Updated**: February 2026  
**Network**: Hedera Testnet & Mainnet

