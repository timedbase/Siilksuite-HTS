#!/usr/bin/env bash
set -euo pipefail

# Silksuite DEX Programmatic Trading Client - MAINNET ONLY
# This script handles wallet validation and token association configuration
# Usage: ./trade.sh [--account 0.0.x] [--key <private-key>]

show_help() {
  cat <<EOF
Usage: $0 [options]

Options:
  -a, --account        Hedera account ID (e.g. 0.0.123456) (will prompt if omitted)
  -k, --key            Private key (will prompt if omitted)
  -d, --debug          Keep process alive after run for debugging
  -h, --help           Show this help

Interactive Modes:
  The script will prompt you to choose between:
  • Regular Swap: Execute immediately with specified amount
  • Snipe Mode:   Monitor for pool creation (5 hours max) and auto-execute when found

Example:
  ./trade.sh -a 0.0.12345 -k "302e02..."

Note: This client operates on MAINNET only. Test carefully with small amounts.
EOF
}

# MAINNET ONLY - No network selection
OP_ACCOUNT=""
OP_KEY=""
BASE_TOKEN="0.0.786931"
BASE_AMOUNT=""
SWAP_TOKEN="HBAR"
SNIPE_MODE="0"
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

# Ask if user wants snipe mode
echo ""
echo "Swap Mode?"
echo "  1) Regular Swap (execute immediately)"
echo "  2) Snipe Mode (monitor pool for 5 hours, execute when found)"
read -rp "Choose mode [1]: " SWAP_MODE_CHOICE
SWAP_MODE_CHOICE="${SWAP_MODE_CHOICE:-1}"

if [[ "$SWAP_MODE_CHOICE" == "2" ]]; then
  SNIPE_MODE="1"
  echo "✅ Snipe mode enabled (will monitor for pool and execute)"
else
  echo "✅ Regular swap mode enabled (execute immediately)"
fi

# Ensure dependencies
if [ ! -d node_modules ]; then
  echo "Installing npm dependencies..."
  npm install
fi

# === STEP 3: ENSURE TOKEN ASSOCIATIONS (Configuration Stage) ===
echo ""
echo "=========================================="
echo "Step 3: Ensuring Token Associations"
echo "=========================================="
echo "Checking and associating tokens for swap..."

ASSOC_OUTPUT=$(MAINNET_OPERATOR_ID="$OP_ACCOUNT" MAINNET_OPERATOR_PRIVATE_KEY="$OP_KEY" BASE_TOKEN="$BASE_TOKEN" SWAP_TOKEN="$SWAP_TOKEN" node -e "
const { Client, AccountId, TokenId, TokenAssociateTransaction, PrivateKey } = require('@hashgraph/sdk');
const axios = require('axios');

(async () => {
  let client = null;
  try {
    const opId = process.env.MAINNET_OPERATOR_ID;
    const privKeyStr = process.env.MAINNET_OPERATOR_PRIVATE_KEY;
    const baseToken = process.env.BASE_TOKEN;
    const swapToken = process.env.SWAP_TOKEN;

    // Parse credentials
    const privKey = PrivateKey.fromString(privKeyStr);
    const accountId = AccountId.fromString(opId);
    
    // Initialize Hedera SDK client
    client = Client.forMainnet();
    client.setOperator(accountId, privKey);

    // Function to check and associate a token
    const ensureTokenAssociated = async (tokenIdStr, tokenName) => {
      if (tokenIdStr.toUpperCase() === 'HBAR') {
        console.log('✅ ' + tokenName + ' is HBAR (no association needed)');
        return true;
      }

      console.log('🔍 Checking ' + tokenName + ' association: ' + tokenIdStr);
      
      try {
        // Check via Mirror Node first
        const mirror = axios.create({ baseURL: 'https://mainnet-public.mirrornode.hedera.com', timeout: 10000 });
        const acctResp = await mirror.get('/api/v1/accounts/' + opId);
        const tokens = acctResp.data.balance?.tokens || [];
        const isAssociated = tokens.some(t => t.token_id === tokenIdStr);
        
        if (isAssociated) {
          console.log('✅ ' + tokenName + ' already associated');
          return true;
        }
      } catch (e) {
        console.warn('⚠️  Could not check association status via Mirror Node');
      }

      // Not associated - create association using user's private key
      try {
        console.log('📝 Creating token association transaction (signed with provided private key)...');
        const tokenId = TokenId.fromString(tokenIdStr);
        
        // Create transaction
        const txn = new TokenAssociateTransaction()
          .setAccountId(accountId)
          .addTokenId(tokenId);
        
        // Freeze with client to set node and transaction ID
        const frozenTxn = await txn.freezeWith(client);
        
        // Sign with user's provided private key
        console.log('🔑 Signing with provided private key...');
        const signedTxn = await frozenTxn.sign(privKey);
        
        // Execute signed transaction
        console.log('🚀 Executing association transaction...');
        const response = await signedTxn.execute(client);
        console.log('⏳ Waiting for receipt...');
        const receipt = await response.getReceipt(client);

        if (receipt.status._code === 0 || receipt.status.toString() === 'SUCCESS') {
          console.log('✅ ' + tokenName + ' successfully associated (txId: ' + response.transactionId + ')');
          return true;
        } else if (receipt.status.toString().includes('TOKEN_ALREADY_ASSOCIATED')) {
          console.log('✅ ' + tokenName + ' already associated');
          return true;
        } else {
          console.error('❌ ' + tokenName + ' association failed with status: ' + receipt.status);
          return false;
        }
      } catch (e) {
        if (e.message && e.message.includes('TOKEN_ALREADY_ASSOCIATED')) {
          console.log('✅ ' + tokenName + ' already associated');
          return true;
        }
        console.error('❌ ' + tokenName + ' association error: ' + (e.message || e));
        return false;
      }
    };

    // Ensure both tokens are associated
    const baseOk = await ensureTokenAssociated(baseToken, 'Base token');
    const swapOk = await ensureTokenAssociated(swapToken, 'Swap token');

    if (!baseOk || !swapOk) {
      console.error('❌ One or more tokens could not be associated');
      process.exit(1);
    }

    console.log('✅ All tokens confirmed associated - ready for swap execution');
  } catch (err) {
    console.error('❌ Token association error: ' + (err.message || err));
    process.exit(1);
  } finally {
    if (client) await client.close();
  }
})();
" 2>&1)
ASSOC_EXIT=$?
echo "$ASSOC_OUTPUT"

if [ $ASSOC_EXIT -ne 0 ]; then
  echo ""
  echo "❌ Token association failed in Step 3."
  echo "Please check your credentials and try again."
  exit 1
fi

echo ""
echo "=========================================="
echo "Step 4: Executing Swap"
echo "=========================================="

# Export MAINNET env vars consumed by the JS engine
export MAINNET_OPERATOR_ID="$OP_ACCOUNT"
export MAINNET_OPERATOR_PRIVATE_KEY="$OP_KEY"
export DEBUG="$DEBUG"
export BASE_TOKEN="$BASE_TOKEN"
export BASE_AMOUNT="$BASE_AMOUNT"
export SWAP_TOKEN="$SWAP_TOKEN"

# Hand off to Node.js trade engine (mainnet-only, no network arg needed)
if [[ "$SNIPE_MODE" == "1" ]]; then
  node src/trade.js --base-token "$BASE_TOKEN" --base-amount "$BASE_AMOUNT" --swap-token "$SWAP_TOKEN" --snipe
else
  node src/trade.js --base-token "$BASE_TOKEN" --base-amount "$BASE_AMOUNT" --swap-token "$SWAP_TOKEN"
fi
