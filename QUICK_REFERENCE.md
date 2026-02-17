# Quick Reference Card — Silksuite DEX Trading Client

## 📱 Getting Started (60 seconds)

### Linux/macOS
```bash
git clone https://github.com/timedbase/Siilksuite-HTS.git
cd Siilksuite-HTS
npm install
./trade.sh
```

### Windows (PowerShell)
```powershell
git clone https://github.com/timedbase/Siilksuite-HTS.git
cd Siilksuite-HTS
npm install
node src/trade.js --network mainnet
```

### WSL 2 (Windows)
```bash
wsl ./trade.sh
```

---

## 🎯 Basic Workflow

| Step | Action | Input |
|------|--------|-------|
| 1️⃣ | Run script | `./trade.sh` or `node src/trade.js` |
| 2️⃣ | Enter Account ID | `0.0.123456` |
| 3️⃣ | Enter Private Key | Paste key (hidden) |
| 4️⃣ | Validation ✅ | System checks balance |
| 5️⃣ | Choose Base Token | `HBAR` or `0.0.786931` |
| 6️⃣ | Choose Swap Token | `HBAR` or token ID |
| 7️⃣ | Enter Amount | Number (e.g., `5000`) |
| 8️⃣ | Execute Swap | System connects to Smart Node |

---

## 🔑 Key Commands

### Run Trading Client
```bash
./trade.sh
```

### With Arguments (No Prompts)
```bash
./trade.sh -a 0.0.123456 -k "your_private_key" -b 0.0.786931 -A 5000 -s HBAR
```

### Test Smart Node Connectivity
```bash
npm run test-nodes
```

### Run Directly with Node.js
```bash
MAINNET_OPERATOR_ID="0.0.123456" \
MAINNET_OPERATOR_PRIVATE_KEY="your_key" \
BASE_TOKEN="0.0.786931" \
BASE_AMOUNT="5000" \
SWAP_TOKEN="HBAR" \
node src/trade.js --network mainnet
```

---

## ⚙️ Command Options

```bash
./trade.sh [options]

Options:
  -a, --account        Account ID (e.g., 0.0.123456)
  -k, --key            Private key in DER format
  -b, --base-token     Token to spend (default: 0.0.786931)
  -A, --base-amount    Amount to spend (required)
  -s, --swap-token     Token to receive (default: HBAR)
  -d, --debug          Keep process alive for debugging
  -h, --help           Show help message
```

---

## 💰 Token ID Format

### Valid Formats
- ✅ `HBAR` — Native Hedera token
- ✅ `0.0.786931` — Specific token ID
- ✅ `0.0.1` — Account ID 1

### Example
```bash
./trade.sh -b HBAR -s 0.0.786931    # Swap HBAR for token 0.0.786931
./trade.sh -b 0.0.786931 -s HBAR    # Swap token for HBAR
```

---

## 🐛 Troubleshooting

### Problem: "Invalid credentials"
✅ **Solution**: Check Account ID format (`0.0.123456`) and private key format

### Problem: "Could not fetch balance"
✅ **Solution**: Check internet connection and run `npm run test-nodes`

### Problem: "WebSocket timeout"
✅ **Solution**: Smart Nodes may be under maintenance — wait and retry

### Problem: "Insufficient balance"
✅ **Solution**: Ensure account has enough HBAR for swap + fees (~0.1 HBAR)

### Problem: Script not executable (Linux/Mac)
✅ **Solution**: Run `chmod +x trade.sh` then retry

### Problem: Node.js not found (Windows)
✅ **Solution**: Restart PowerShell or reinstall Node.js from nodejs.org

---

## 📊 System Requirements

| Component | Requirement |
|-----------|-------------|
| Node.js | v14.0+ |
| RAM | 512 MB minimum |
| Disk | 100 MB free space |
| Network | Internet connection required |
| OS | Windows, Linux, macOS, Android (Termius) |

---

## 🔗 Useful Links

- 📖 [Full Documentation](./README.md)
- 🛠️ [Setup Guide](./SETUP_GUIDE.md)
- 📜 [License](./LICENSE)
- 🌐 [Hedera Documentation](https://docs.hedera.com)
- 🔗 [Silksuite Network](https://hbarsuite.network)
- 📱 [Termius App](https://www.termius.com)

---

## ⚠️ Security Checklist

- [ ] Never commit private keys to git
- [ ] Never share private key in chat/email
- [ ] Test with small amounts first
- [ ] Verify Smart Node status before trading
- [ ] Use hardware wallet for production
- [ ] Keep Node.js and dependencies updated

---

## 🚀 Advanced Usage

### Run as Background Service (Linux)
```bash
nohup ./trade.sh > trading.log 2>&1 &
```

### Use with tmux (Keeps process alive)
```bash
tmux new-session -d -s trader './trade.sh'
tmux attach -t trader
```

### Monitor Sniper Cache
```bash
tail -f .sniper-cache/sniper-state.json
```

### Install Globally
```bash
npm install -g .
siilksuite-trader    # Run from anywhere
```

---

## 📞 Support

1. Check [Troubleshooting](#troubleshooting) section
2. Run `npm run test-nodes` to diagnose network issues
3. Check [SETUP_GUIDE.md](./SETUP_GUIDE.md) for platform-specific help
4. Open an issue: https://github.com/timedbase/Siilksuite-HTS/issues

---

**Version**: 1.0.0 | **Last Updated**: February 2026
