# Silksuite DEX Programmatic Trading Client — MAINNET ONLY

A JavaScript-based trading client for sniping and trading tokens on the **Silksuite DEX** using **Hedera Mainnet**. This tool provides an interactive shell interface for wallet management, token association, and programmatic swaps via RESTful APIs and WebSockets.

## 🎯 Features

- ✅ **Interactive Shell Entrypoint** — `trade.sh` prompts for Account ID and Private Key
- ✅ **Wallet Validation** — Verifies Account ID balance against Hedera Mirror Node
- ✅ **Public Key Derivation** — Derives public key from private key and validates matching balances
- ✅ **Regular & Snipe Modes** — Execute immediately or monitor and auto-execute when pool appears
- ✅ **Snipe Mode Polling** — Continuously monitors for pool creation (5-hour timeout)
- ✅ **Token Sniping** — Programmatically swap tokens on Silksuite DEX via Smart Nodes
- ✅ **REST & WebSocket Support** — Uses REST APIs and socket.io for real-time trading
- ✅ **Smart Node Connectivity Check** — Diagnostic tool to test node health
- ✅ **Cross-Platform Support** — Works on Windows (PowerShell), Linux/Mac, and Android (Termux)

## 📋 Prerequisites

- **Node.js** v14+ (download from [nodejs.org](https://nodejs.org))
- **Git** (optional, for cloning)
- **Hedera Mainnet Account** with HBAR balance (⚠️ MAINNET ONLY)
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

# Run the trading client via WSL (recommended)
wsl ./trade.sh
```

Alternatively, use Windows Subsystem for Linux (WSL) for full shell script support.

### Option 3: Android Terminal (Termux)

1. **Install Termux** from Google Play Store or [F-Droid](https://f-droid.org/packages/com.termux/)
2. **Install Required Tools**:
   ```bash
   pkg update
   pkg install git
   pkg install nodejs
   ```
3. **Clone & Setup Repository**:
   ```bash
   git clone https://github.com/timedbase/Siilksuite-HTS.git
   cd Siilksuite-HTS
   npm install
   ```
4. **Run the Trading Client**:
   ```bash
   ./trade.sh
   ```

**Note**: Termux provides a native terminal environment on Android. All tools run locally on your device. For better performance with CPU-intensive trading, consider running this on a desktop/laptop or cloud server instead.

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

### Step 2: Configure Swap Parameters & Choose Mode

After wallet validation, enter swap configuration:

```
Base token (HBAR or token id e.g. 0.0.786931) [0.0.786931]: 
Swap token (HBAR or token id e.g. 0.0.786931) [HBAR]: 
Amount to spend (HBAR): 

Swap Mode?
  1) Regular Swap (execute immediately)
  2) Snipe Mode (monitor pool for 5 hours, execute when found)
Choose mode [1]: 
```

**Supported Token Formats**:
- `HBAR` — Hedera's native token (no association needed)
- `0.0.123456` — Hedera token ID format

**Swap Modes**:
- **Regular Swap (Mode 1)** — Execute the swap immediately with the specified amount
- **Snipe Mode (Mode 2)** — Monitor Smart Nodes for pool creation and auto-execute when found (5-hour monitoring window)

### Step 3: Token Association (Configuration Stage)

The script automatically checks and associates tokens if needed:

```
==========================================
Step 3: Ensuring Token Associations
==========================================
🔍 Checking base token association: 0.0.786931
✅ Already associated with base token

🔗 Checking swap token association: HBAR
✅ Swap token is HBAR (no association needed)

✅ Token association check complete
```

**Important**: Token associations are handled during this configuration stage, not during swap execution. This ensures smooth swaps without delays.

### Step 4: Execute Swap (Regular or Snipe)

**For Regular Swap Mode:**
Once configuration is complete, the trading engine:
1. Verifies token associations
2. Connects to available Smart Nodes via WebSocket
3. Requests an unsigned swap transaction
4. Signs the transaction locally with your private key
5. Submits the signed transaction for execution
6. Displays transaction receipt and status

**For Snipe Mode:**
The script monitors continuously for the target pool:
1. Queries Smart Nodes every 650ms for available liquidity pools
2. Searches for the specified token pair (base ↔ swap)
3. **When pool is found:** Automatically executes the swap as above
4. If pool not found within 5 hours: Monitoring stops (timeout)
5. Provides real-time feedback on checks and final status

**Example Snipe Mode Output**:
```
⏱️ Next check in 650ms... (check 1/27463)
⏱️ Next check in 650ms... (check 2/27463)
✅ POOL FOUND! Executing swap...
🔄 Executing swap: 5000 0.0.786931 → HBAR
✅ Swap executed! Txn: 0.0.123456-1234567890-123456
```

## 🔧 Advanced Usage

### Run with Command-Line Arguments

```bash
./trade.sh \
  --account 0.0.123456 \
  --key "302e020100300506032b6570042204203a..." \
  --debug
```

**Options**:
- `-a, --account` — Hedera account ID
- `-k, --key` — Private key (DER format)
- `-d, --debug` — Keep process alive for debugging
- `-h, --help` — Show help message

(Note: Token pairs are selected during interactive prompts)

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
- ⚠️ **THIS IS MAINNET** — Use with real funds! Start with small amounts
- ⚠️ **ALWAYS** verify Smart Node connectivity before trading
- ✅ **DO** use a hardware wallet for production accounts
- ✅ **DO** test transactions with minimal amounts first
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

Silksuite DEX Trading Client workflow (MAINNET ONLY):

```
User (Terminal)
    ↓
./trade.sh (Interactive Shell - Configuration Stage)
    ├── Step 1: Wallet Credential Validation
    │   └── Verifies Account ID & Private Key via Mirror Node
    ├── Step 2: Configure Swap Parameters & Choose Mode
    │   ├── Select base token, swap token, and amount
    │   └── Choose: Regular Swap OR Snipe Mode
    ├── Step 3: Token Association (Configuration)
    │   ├── Checks token associations via Mirror Node
    │   ├── Associates swap token if needed
    │   └── Ensures account ready for swap
    └── Step 4: Execute Swap (Regular or Snipe)
         ↓
    src/trade.js (Core Trading Engine - Execution)
         │
    REGULAR SWAP    │    SNIPE MODE
    ├─ Verify assoc │    ├─ Poll /pools/list every 650ms
    ├─ Connect WS   │    ├─ Search for token pair
    ├─ Request txn  │    ├─ On pool found:
    ├─ Sign locally │    │  ├─ Verify associations
    ├─ Submit       │    │  ├─ Connect & request txn
    └─ Return       │    │  ├─ Sign & submit
       receipt      │    │  └─ Return receipt
                    │    └─ (Or timeout after 5 hours)
         ↓
    Hedera Mainnet (Block Settlement)
```

**Key Design**:
- Token associations are handled during configuration (trade.sh Step 3), not during swap execution
- Regular Swap: Execute immediately with your specified amount
- Snipe Mode: Monitor for target pool and auto-execute when found or after 5-hour timeout

## 🔗 References

- [Hedera SDK for JavaScript](https://github.com/hashgraph/hedera-sdk-js)
- [Hedera Mirror Node API](https://docs.hedera.com/hedera/sdks-and-apis/rest-api)
- [Silksuite DEX Documentation](https://hbarsuite.network)
- [Socket.IO Documentation](https://socket.io/docs/)
- [OpenGL3 License](./LICENSE)

## 📝 License

This project is licensed under the **OpenGL3 License** — see [LICENSE](./LICENSE) file for details.

## 🤝 Contributing

Contributions welcome! Please note:
- **MAINNET ONLY** — This client operates on Hedera Mainnet only
- **Token Associations** — Handle during configuration stage, not execution
- Test carefully with small amounts before major deployments

To contribute:
1. Fork this repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## ⚠️ Disclaimer

**This client operates on Hedera MAINNET with real funds. Use with extreme caution.**

This software is provided "as-is" without warranty. Users are responsible for:
- Understanding the risks of trading on decentralized exchanges
- Securely managing their private keys and credentials
- Complying with applicable laws and regulations in their jurisdiction
- Testing thoroughly with small amounts first

**NEVER use this tool without understanding what you're doing. MAINNET trades use real funds and cannot be reversed.**

---

**Version**: 1.1.0  
**Last Updated**: February 2026  
**Network**: Hedera Mainnet Only  
**Snipe Mode Timeout**: 5 hours (650ms polling interval)

