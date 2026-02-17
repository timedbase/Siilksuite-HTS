#!/usr/bin/env bash
set -euo pipefail

# Simple entrypoint for providing your Hedera wallet and running a programmatic swap
# Usage: ./trade.sh [--network testnet] [--account 0.0.x] [--key <private-key>] --base-token <id> --base-amount <amount> --swap-token <id|HBAR>

show_help() {
  cat <<EOF
Usage: $0 [options]

Options:
  -a, --account        Hedera MAINNET account ID (e.g. 0.0.123456)  (will prompt if omitted)
  -k, --key            Private key (will prompt if omitted)
  -b, --base-token     Token id to spend (default: 0.0.786931)
  -A, --base-amount    Amount to spend (required)
  -s, --swap-token     Token to receive (default: HBAR)
  -d, --debug          Keep process alive after run for debugging (won't auto-exit)
  -h, --help           Show this help

Example:
  ./trade.sh -a 0.0.12345 -k "302e02..." -b 0.0.786931 -A 5000 -s HBAR -d
EOF
}

NETWORK="mainnet"
OP_ACCOUNT=""
OP_KEY=""
BASE_TOKEN="0.0.786931"
BASE_AMOUNT=""
SWAP_TOKEN="HBAR"
DEBUG="0"

# Validate token ID format (accepts HBAR or Hedera token id like 0.0.123456)
is_valid_token_id() {
  local t="$1"
  if [[ -z "$t" ]]; then
    return 1
  fi
  # accept case-insensitive HBAR
  if [[ "${t^^}" == "HBAR" ]]; then
    return 0
  fi
  # token id pattern: digits.digits.digits (e.g. 0.0.786931)
  if [[ "$t" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    return 0
  fi
  return 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -a|--account) OP_ACCOUNT="$2"; shift 2;;
    -k|--key) OP_KEY="$2"; shift 2;;
    -b|--base-token) BASE_TOKEN="$2"; shift 2;;
    -A|--base-amount) BASE_AMOUNT="$2"; shift 2;;
    -s|--swap-token) SWAP_TOKEN="$2"; shift 2;;
    -d|--debug) DEBUG="1"; shift 1;;
    -h|--help) show_help; exit 0;;
    *) echo "Unknown option: $1"; show_help; exit 1;;
  esac
done

if [ -z "$OP_ACCOUNT" ]; then
  read -rp "Hedera account ID (e.g. 0.0.123456): " OP_ACCOUNT
fi

if [ -z "$OP_KEY" ]; then
  read -rs -p "Private key (hidden): " OP_KEY
  echo
fi

# === VALIDATE WALLET CREDENTIALS BEFORE ASKING FOR TOKENS ===
echo ""
echo "=========================================="
echo "Step 1: Validating Wallet Credentials"
echo "=========================================="
VALIDATE_OUTPUT=$(MAINNET_OPERATOR_ID="$OP_ACCOUNT" MAINNET_OPERATOR_PRIVATE_KEY="$OP_KEY" node -e "
const { PrivateKey } = require('@hashgraph/sdk');
const axios = require('axios');

(async () => {
  try {
    const privKeyStr = process.env.MAINNET_OPERATOR_PRIVATE_KEY;
    const accId = process.env.MAINNET_OPERATOR_ID;
    const privKey = PrivateKey.fromString(privKeyStr);
    const pubKey = privKey.publicKey;
    console.log(\`📍 Account ID: \${accId}\`);
    console.log(\`📍 Public Key (derived): \${pubKey.toString()}\`);
    
    // Fetch balance from Hedera Mirror Node (public API)
    try {
      const cli = axios.create({ baseURL: 'https://mainnet-public.mirrornode.hedera.com', timeout: 10000 });
      const resp = await cli.get(\`/api/v1/accounts/\${accId}\`);
      if (resp && resp.data && resp.data.balance) {
        const tinybars = Number(resp.data.balance.balance || 0);
        const bal = (tinybars / 1e8).toFixed(8);
        console.log(\`💰 HBAR Balance: \${bal} HBAR\`);
        if (tinybars < 0.1e8) console.warn('⚠️  WARNING: Balance <0.1 HBAR (may be low for swap fees)');
      }
    } catch (e) {
      console.log('ℹ️  Could not fetch balance from Hedera Mirror Node (network may be unreachable).');
    }
    console.log('✅ Credentials validated');
  } catch (err) {
    console.error('❌ Invalid credentials:', err.message || err);
    process.exit(1);
  }
})();
" 2>&1)
VALIDATE_EXIT=$?
echo "$VALIDATE_OUTPUT"
if [ $VALIDATE_EXIT -ne 0 ]; then
  exit 1
fi
echo ""

# === NOW PROMPT FOR TOKEN PARAMS ===
echo "=========================================="
echo "Step 2: Configure Swap Parameters"
echo "=========================================="
while true; do
  read -rp "Base token (HBAR or token id e.g. 0.0.786931) [${BASE_TOKEN}]: " _INPUT
  _INPUT="${_INPUT:-$BASE_TOKEN}"
  # normalize user input
  if is_valid_token_id "$_INPUT"; then
    if [[ "${_INPUT^^}" == "HBAR" ]]; then
      BASE_TOKEN="HBAR"
    else
      BASE_TOKEN="$_INPUT"
    fi
    break
  else
    echo "Invalid token — enter 'HBAR' or a token id like 0.0.123456. Try again."
  fi
done

# Prompt for swap token (must be HBAR or token id)
while true; do
  read -rp "Swap token (HBAR or token id e.g. 0.0.786931) [${SWAP_TOKEN}]: " _INPUT2
  _INPUT2="${_INPUT2:-$SWAP_TOKEN}"
  if is_valid_token_id "$_INPUT2"; then
    if [[ "${_INPUT2^^}" == "HBAR" ]]; then
      SWAP_TOKEN="HBAR"
    else
      SWAP_TOKEN="$_INPUT2"
    fi
    break
  else
    echo "Invalid token — enter 'HBAR' or a token id like 0.0.123456. Try again."
  fi
done

if [ -z "$BASE_AMOUNT" ]; then
  read -rp "Amount to spend (${BASE_TOKEN}): " BASE_AMOUNT
fi

# Ensure dependencies
if [ ! -d node_modules ]; then
  echo "Installing npm dependencies..."
  npm install
fi

# Export MAINNET env vars consumed by the JS engine
export MAINNET_OPERATOR_ID="$OP_ACCOUNT"
export MAINNET_OPERATOR_PRIVATE_KEY="$OP_KEY"
export DEBUG="$DEBUG"

export BASE_TOKEN="$BASE_TOKEN"
export BASE_AMOUNT="$BASE_AMOUNT"
export SWAP_TOKEN="$SWAP_TOKEN"

# Hand off to Node.js trade engine (mainnet-only)
node src/trade.js --network "mainnet" --base-token "$BASE_TOKEN" --base-amount "$BASE_AMOUNT" --swap-token "$SWAP_TOKEN"
