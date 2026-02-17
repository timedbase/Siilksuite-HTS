# Minimal HSuite-style Programmatic Swap Client

Quick demo: a shell entrypoint (`trade.sh`) for providing your wallet and a Node.js trade engine (`src/trade.js`) that performs a programmatic swap using HSuite Smart Nodes.

Features
- Shell script prompts for wallet/account and private key ✅
- JS trade engine: requests unsigned swap, signs locally, executes via WebSocket ✅
- Uses Hedera SDK for signing and socket.io for Smart Node communication ✅
- Validates wallet credentials against Hedera Mirror Node ✅
- Comprehensive connectivity diagnostics (`npm run test-nodes`) ✅

Getting started
1. Install dependencies:
   npm install

2. Run the interactive entrypoint:
   ./trade.sh

3. Check Smart Node connectivity (if swap fails):
   npm run test-nodes

Security
- Do NOT commit private keys.
- This client targets MAINNET only — test carefully and use very small amounts.

Files added
- `trade.sh` — interactive shell entrypoint (prompts for keys)
- `src/trade.js` — Node.js trade engine (core logic)
- `scripts/test-nodes.js` — Smart Node connectivity diagnostic
- `package.json` — dependencies
- `.env.template` — example environment variables

Notes
- This is a minimal reference implementation following the programmatic-swaps approach. This client targets MAINNET only — test carefully and use very small amounts when experimenting.
- Smart Nodes may undergo maintenance. Check status with `npm run test-nodes` before running trades.

