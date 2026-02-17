# FAQ — Silksuite DEX Trading Client

Frequently Asked Questions and Answers

## Installation & Setup

### Q: Do I need to be a developer to use this?
**A:** No! This tool is designed for non-developers. Just install Node.js, clone the repo, and run `./trade.sh`. The script handles everything interactively.

### Q: What operating systems does this support?
**A:** 
- ✅ Windows (PowerShell or WSL 2)
- ✅ Linux (Ubuntu, Debian, etc.)
- ✅ macOS
- ✅ Android (via Termius SSH app)

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for platform-specific instructions.

### Q: How much does it cost to use this tool?
**A:** The tool itself is **free** and open-source (OpenGL3 License). You only pay for:
- Transaction fees to Hedera Network (~0.1 HBAR per swap)
- Your HBAR/token amounts you want to trade

### Q: Do I need a Hedera account?
**A:** Yes, you need:
1. A **Hedera account** (get one from [HashPack](https://www.hashpack.app) or [Blade Wallet](https://www.bladewallet.io))
2. **Account ID** (format: `0.0.123456`)
3. **Private Key** (keep this secret!)
4. **HBAR balance** (minimum for trading: ~0.2 HBAR)

### Q: Where do I get my Account ID and Private Key?
**A:** 
- Open your wallet (HashPack, Blade, etc.)
- Go to Settings or Account Info
- Copy your Account ID
- Export/backup your private key (store securely!)

---

## Security & Privacy

### Q: Is my private key safe?
**A:** 
- ✅ The script signs transactions **locally** on your machine
- ✅ Your private key **never** leaves your computer
- ❌ Don't paste it in chat apps or share it
- ❌ Don't commit it to git
- ✅ Use `.gitignore` to prevent accidents

### Q: Can the developers see my private key?
**A:** No. This is open-source software that runs **entirely on your machine**. There's no backend server that sees your keys.

### Q: What if someone gets my private key?
**A:** They can access all funds in that account. Immediately:
1. Transfer all funds to a new account
2. Deactivate the compromised account
3. Never use that account again

### Q: Should I use a new account just for trading?
**A:** Yes! Best practice:
1. Create a **dedicated Hedera account** for trading
2. Transfer only the amount you want to trade
3. Keep this account separate from your main wallet

### Q: Is it safe to use on a public WiFi?
**A:** Not recommended. The private key is handled locally and encrypted during transmission, but a public WiFi could have network sniffing. Use a VPN or mobile hotspot when possible.

---

## Trading & Tokens

### Q: What the difference between HBAR and other tokens?
**A:** 
- **HBAR** — Native Hedera currency, used for fees
- **Tokens** — Custom tokens on Hedera (identified by ID like `0.0.786931`)

### Q: How do I find token IDs?
**A:** 
- Check Silksuite DEX UI or documentation
- Look on [Hedera Explorer](https://hashscan.io)
- Format: `0.0.XXXXXX` (example: `0.0.786931`)

### Q: What's the minimum amount to trade?
**A:** Technically, you can trade 1 tiny unit, but you need enough HBAR to cover:
- **Swap amount** (what you're trading)
- **Transaction fee** (~0.1 HBAR per swap)

For practical purposes: **minimum 0.2 HBAR** in your account

### Q: Can I trade between any tokens?
**A:** Not all token pairs exist. The Smart Nodes must support the pair. If a pair doesn't exist, the swap will fail. Check Silksuite DEX for available pairs.

### Q: How long does a swap take?
**A:** 
- Typically **3-10 seconds** after submission
- Hedera block time is ~3 seconds
- Network latency may add seconds

### Q: What if my transaction fails?
**A:** 
- Check your balance (run `npm run test-nodes`)
- Ensure Smart Nodes are online
- Retry after a moment
- If persistent, try a different token pair

---

## Wallet & Balance Validation

### Q: Why does the script validate my wallet?
**A:** The script checks:
1. **Private key is valid** — Can derive a public key
2. **Account exists** — Queries Hedera Mirror Node
3. **Balance matches** — Both Account and Public Key have same HBAR balance

This ensures your credentials are correct before attempting a swap.

### Q: What if validation fails?
**A:** The script will ask you to re-enter:
1. Account ID — Format must be `0.0.123456`
2. Private Key — Must be in DER format (starts with `302e`)

Check your wallet app to get the correct values.

### Q: Can the script work offline?
**A:** No. It requires internet to:
- Query Hedera Mirror Node (balance check)
- Connect to Smart Nodes (submit swaps)

---

## Smart Nodes & Connectivity

### Q: What are Smart Nodes?
**A:** Smart Nodes are specialized Hedera network nodes that handle DEX trading. The script connects via WebSocket to submit swaps.

### Q: How do I know if Smart Nodes are working?
**A:** Run the diagnostic:
```bash
npm run test-nodes
```

This tests:
- HTTP connectivity
- WebSocket connection
- Hedera Mirror Node access

### Q: What if no Smart Nodes respond?
**A:** 
1. Check your internet connection
2. Wait 5-10 minutes (may be under maintenance)
3. Try again with `./trade.sh`
4. Check Silksuite status page at https://hbarsuite.network

### Q: Can I use a different Smart Node?
**A:** The script automatically rotates between available nodes. You can't manually select one (yet).

---

## Troubleshooting Common Issues

### Q: "Invalid credentials" — What does this mean?
**A:** Your Account ID or Private Key is in wrong format:
- **Account ID**: Must be `0.0.123456` (not `0.123456` or `123456`)
- **Private Key**: Must be DER format (starts with `302e` or similar hex)

### Q: "Could not fetch balance from Hedera Mirror Node"
**A:** Network issue. Try:
1. Check internet connection
2. Wait a moment and retry
3. Run `npm run test-nodes` to diagnose

### Q: "WebSocket connection timeout"
**A:** Smart Nodes are unreachable:
1. Check internet connection
2. Run `npm run test-nodes`
3. If all nodes timeout, they're likely under maintenance
4. Wait and retry in 5-10 minutes

### Q: "ENOMEM" or "out of memory"
**A:** Your computer is low on RAM. Close other apps and retry.

### Q: "ENOENT: no such file or directory"
**A:** Missing files. Try:
```bash
npm install
```

### Q: Permission denied (Linux/Mac)
**A:** Make script executable:
```bash
chmod +x trade.sh
```

### Q: Script hangs or doesn't respond
**A:** 
1. Press `Ctrl+C` to stop
2. Try again
3. Check internet connection
4. Run `npm run test-nodes`

---

## Performance & Speed

### Q: Why is my trade slow?
**A:** Trading speed depends on:
- **Network latency** — Your internet speed
- **Smart Node response time** — Usually 1-3 seconds
- **Hedera block time** — ~3 seconds per block
- **Traffic** — High volume may cause delays

Average trade time: **5-15 seconds** from submission to completion

### Q: Can I run multiple trades simultaneously?
**A:** Yes, but be careful:
- Each script instance consumes resources
- Fast-moving markets may cause issues
- Monitor your balance closely
- Use `tmux` or `screen` to manage multiple sessions

### Q: Can I run this on my phone?
**A:** Not directly, but you can:
1. Use **Termius SSH app** to connect to a remote server
2. Run the script on the server
3. Control it from your phone

See [SETUP_GUIDE.md — Android (Termius SSH)](./SETUP_GUIDE.md#android-termius-ssh)

---

## Advanced Topics

### Q: Can I automate trading?
**A:** This is a manual trading tool. For automation, you'd need to:
1. Modify `src/trade.js`
2. Add your own automation logic
3. Use cron jobs or task schedulers

This is beyond scope of basic usage. See the code for ideas.

### Q: Can I use this with testnet?
**A:** Currently, the script targets **MAINNET only**. But you can modify the code to use testnet Mirror Node and Smart Nodes if available.

### Q: Can I trade multiple token pairs?
**A:** Yes, run the script multiple times:
```bash
./trade.sh    # First trade
# (waits for completion)
./trade.sh    # Second trade
```

Or use `tmux` for parallel trades (advanced).

### Q: Can I cancel a pending swap?
**A:** Once submitted to the blockchain, it **cannot be cancelled**. You can only wait for confirmation or timeout.

### Q: How do I report a bug?
**A:** 
1. Check existing issues: https://github.com/timedbase/Siilksuite-HTS/issues
2. Create a new issue with:
   - OS and Node.js version
   - Error message (full output)
   - Steps to reproduce
   - Output from `npm run test-nodes`

---

## Legal & Compliance

### Q: Is this tool legal?
**A:** The tool itself is legal software. **However**:
- Comply with local laws regarding crypto trading
- You're responsible for taxes on gains
- Some jurisdictions restrict crypto activity
- Use at your own legal risk

### Q: Do I need to pay taxes on my trades?
**A:** Yes, in most jurisdictions. Consult a tax professional for your region.

### Q: Is this for insider trading or market manipulation?
**A:** No. This is a legitimate trading tool. Any market manipulation is illegal and against Hedera's ToS.

---

## Getting Help

### Where can I get help?

1. **Read the Documentation**
   - [README.md](./README.md) — Full guide
   - [SETUP_GUIDE.md](./SETUP_GUIDE.md) — Platform-specific setup
   - [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) — Commands cheat sheet

2. **Run Diagnostics**
   ```bash
   npm run test-nodes
   ```

3. **Check GitHub Issues**
   - https://github.com/timedbase/Siilksuite-HTS/issues

4. **Community**
   - [Hedera Discord](https://discord.gg/hedera)
   - [Silksuite Docs](https://hbarsuite.network)

---

**Last Updated**: February 2026 | **Version**: 1.0.0
