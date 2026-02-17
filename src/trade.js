#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { PrivateKey, Transaction, Client, AccountId, TokenAssociateTransaction, TokenId } = require('@hashgraph/sdk');
const io = require('socket.io-client');
const axios = require('axios');
const Decimal = require('decimal.js');
const fs = require('fs');
const path = require('path');

// Global debug flag (can be set by trade.sh or CLI --debug)
const GLOBAL_DEBUG = Boolean(process.env.DEBUG && (process.env.DEBUG === '1' || process.env.DEBUG === 'true' || process.env.DEBUG === 'yes'));

// Cache directory for sniper state
const CACHE_DIR = path.join(process.cwd(), '.sniper-cache');

// Global sniper state
let SNIPER_STATE = {
  isRunning: true,
  poolFound: false,
  lastCheckTime: null,
  checkCount: 0
};

function waitForEnter() {
  return new Promise((resolve) => {
    try {
      console.log('\n[DEBUG] Press Enter to exit...');
      process.stdin.resume();
      process.stdin.once('data', () => {
        process.stdin.pause();
        resolve();
      });
    } catch (e) {
      resolve();
    }
  });
}

async function exitWithCode(code, debug = false) {
  if (debug || GLOBAL_DEBUG) {
    console.log(`[DEBUG] Pausing before exit (code=${code}).`);
    await waitForEnter();
    process.exit(code);
  }
  process.exit(code);
}

// Cache management functions
function initCache() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function getCachePath(key) {
  return path.join(CACHE_DIR, `${key}.json`);
}

function readCache(key) {
  try {
    const cachePath = getCachePath(key);
    if (fs.existsSync(cachePath)) {
      const data = fs.readFileSync(cachePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    // ignore cache read errors
  }
  return null;
}

function writeCache(key, data) {
  try {
    const cachePath = getCachePath(key);
    fs.writeFileSync(cachePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.warn(`⚠️ Failed to write cache for ${key}:`, e.message);
  }
}

function cleanCache() {
  try {
    if (fs.existsSync(CACHE_DIR)) {
      fs.rmSync(CACHE_DIR, { recursive: true, force: true });
      console.log('🧹 Cache cleaned up');
    }
  } catch (e) {
    console.warn(`⚠️ Failed to clean cache:`, e.message);
  }
}

function setupSignalHandlers() {
  const cleanup = async () => {
    console.log('\n📍 Received stop signal...');
    SNIPER_STATE.isRunning = false;
    cleanCache();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

process.on('uncaughtException', async (err) => {
  console.error('Uncaught Exception:', err && err.stack ? err.stack : err);
  if (GLOBAL_DEBUG) {
    await waitForEnter();
  }
  process.exit(1);
});

process.on('unhandledRejection', async (reason) => {
  console.error('Unhandled Rejection:', reason);
  if (GLOBAL_DEBUG) {
    await waitForEnter();
  }
  process.exit(1);
});

// Validate token string: accepts 'HBAR' (case-insensitive) or Hedera token id '0.0.123456'
function isValidTokenString(t) {
  if (!t || typeof t !== 'string') return false;
  const s = t.trim();
  if (s.toUpperCase() === 'HBAR') return true;
  return /^\d+\.\d+\.\d+$/.test(s);
}

// Verify token association (read-only check)
// Token association now happens during configuration stage in trade.sh
// This function verifies the association exists before swap
async function checkTokenAssociation(network, operatorId, tokenId) {
  // Skip for HBAR (native token, no association needed)
  if (tokenId.toUpperCase() === 'HBAR') {
    return true;
  }

  try {
    console.log(`🔍 Verifying ${tokenId} association...`);
    const mirrorClient = axios.create({ baseURL: 'https://mainnet-public.mirrornode.hedera.com', timeout: 10000 });
    const acctResp = await mirrorClient.get(`/api/v1/accounts/${operatorId}`);

    if (acctResp && acctResp.data && acctResp.data.balance) {
      const associatedTokens = acctResp.data.balance.tokens || [];
      const isAssociated = associatedTokens.some((t) => t.token_id === tokenId);
      
      if (isAssociated) {
        console.log(`✅ Token ${tokenId} is associated`);
        return true;
      } else {
        console.error(`❌ Token ${tokenId} is NOT associated. Run configuration stage in trade.sh first.`);
        return false;
      }
    }
  } catch (err) {
    console.warn('⚠️  Could not verify token association (network issue).');
  }
  return true; // Assume associated if we can't verify
}

// Fetch HBAR balance from a Hedera account using public key derived from private key
// Returns { publicKeyHex, balance } on success
async function validateWalletCredentials(network, operatorId, operatorPrivateKeyStr) {
  try {
    console.log(`\n🔐 Validating wallet credentials for account ${operatorId}...`);

    // Derive public key from private key
    const privKey = PrivateKey.fromString(operatorPrivateKeyStr);
    const pubKey = privKey.publicKey;
    const pubKeyHex = pubKey.toString();

    console.log(`📍 Public Key (derived): ${pubKeyHex}`);

    // Try to fetch account info from Hedera Mirror Node (read-only public API)
    let balanceHbar = null;
    try {
      const httpClient = axios.create({ baseURL: 'https://mainnet-public.mirrornode.hedera.com', timeout: 10000 });
      const accountResp = await httpClient.get(`/api/v1/accounts/${operatorId}`);

      if (accountResp && accountResp.data && accountResp.data.balance) {
        const tinybars = Number(accountResp.data.balance.balance || 0);
        balanceHbar = (tinybars / 1e8).toFixed(8);
        console.log(`💰 HBAR Balance: ${balanceHbar} HBAR`);

        if (tinybars < 0.1e8) {
          console.warn('⚠️ WARNING: Balance is very low (<0.1 HBAR). You may not have enough for transaction fees.');
        } else {
          console.log('✅ Balance sufficient');
        }
      }
    } catch (httpErr) {
      console.warn('ℹ️ Could not fetch balance from Hedera Mirror Node (network may be unreachable).');
    }

    // Return validation result (with or without balance)
    console.log(`📍 Your Hedera account ID: ${operatorId}`);
    console.log('✅ Credentials validated (key derivation successful)');
    
    // Build result explicitly to avoid any scoping issues
    const pubKeyStr = String(pubKeyHex);
    const balStr = balanceHbar !== null ? String(balanceHbar) : null;
    const acctStr = String(operatorId);
    
    return {
      publicKeyHex: pubKeyStr,
      balance: balStr,
      accountId: acctStr
    };
  } catch (err) {
    const errorMsg = err && err.message ? err.message : String(err);
    throw new Error(`Credential validation failed: ${errorMsg}`);
  }
}

// --- Minimal Smart-Node configuration (mainnet-only)
const nodes = {
  mainnet: [
    { operator: '0.0.1786597', url: 'https://mainnet-sn1.hbarsuite.network' },
    { operator: '0.0.1786598', url: 'https://mainnet-sn2.hbarsuite.network' },
    { operator: '0.0.1786599', url: 'https://mainnet-sn3.hbarsuite.network' },
    { operator: '0.0.1786344', url: 'https://mainnet-sn4.hbarsuite.network' },
    { operator: '0.0.1786344', url: 'https://mainnet-sn5.hbarsuite.network' },
    { operator: '0.0.1786345', url: 'https://mainnet-sn6.hbarsuite.network' },
    { operator: '0.0.1786347', url: 'https://mainnet-sn7.hbarsuite.network' },
    { operator: '0.0.1786365', url: 'https://mainnet-sn8.hbarsuite.network' }
  ]
};

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    switch (a) {
      case '--network': case '-n': out.network = args[++i]; break;
      case '--base-token': case '-b': out.baseToken = args[++i]; break;
      case '--base-amount': case '-A': out.baseAmount = args[++i]; break;
      case '--swap-token': case '-s': out.swapToken = args[++i]; break;
      case '--base-decimals': out.baseDecimals = Number(args[++i]); break;
      case '--swap-decimals': out.swapDecimals = Number(args[++i]); break;
      case '--debug': out.debug = true; break;
      case '--snipe': out.snipe = true; break;
      default: /* ignore unknown */ break;
    }
  }
  return out;
}

function pickNode(network) {
  if (network !== 'mainnet') {
    throw new Error('Only mainnet is supported by this client');
  }
  const list = nodes.mainnet;
  return list[Math.floor(Math.random() * list.length)];
}

async function smartNodeClient(network) {
  const node = pickNode(network);
  return axios.create({ baseURL: node.url, withCredentials: true });
}

// Check if pool exists for the given token pair
async function checkPoolLiquidity(httpClient, baseToken, swapToken) {
  try {
    const resp = await httpClient.get('/pools/list');
    if (!resp || !resp.data || !Array.isArray(resp.data)) return null;

    // Look for pool with matching token pair (both directions)
    const base = baseToken === 'HBAR' ? 'HBAR' : String(baseToken).trim();
    const swap = swapToken === 'HBAR' ? 'HBAR' : String(swapToken).trim();

    const pool = resp.data.find(p => {
      const t1 = p.token1_id === base && p.token2_id === swap;
      const t2 = p.token1_id === swap && p.token2_id === base;
      return t1 || t2;
    });

    return pool || null;
  } catch (err) {
    console.warn(`⚠️ Failed to check pool liquidity:`, err.message);
    return null;
  }
}

async function smartNodeSocket(network, walletId, privateKeyStr, opts = {}) {
  // Try each configured Smart Node for the network with retry/backoff.
  const list = nodes[network];
  if (!Array.isArray(list) || list.length === 0) throw new Error(`No Smart Nodes configured for network: ${network}`);

  // randomize start for basic load distribution
  const start = Math.floor(Math.random() * list.length);

  for (let i = 0; i < list.length; i++) {
    const node = list[(start + i) % list.length];
    const wsUrl = node.url.replace(/^https?/, (m) => (m === 'https' ? 'wss' : 'ws'));
    const fullWsUrl = `${wsUrl}/gateway`;

    console.log(`Attempting WebSocket → ${fullWsUrl} (${node.operator}) [${i + 1}/${list.length}]`);

    try {
      const result = await new Promise((resolve, reject) => {
        const socket = io(fullWsUrl, {
          transports: ['websocket'],
          query: { wallet: walletId },
          reconnection: false,
          timeout: opts.connectTimeout || 10000
        });

        const cleanup = (err) => {
          try { socket.off(); socket.disconnect(); } catch (e) { /* ignore */ }
          if (err) return reject(err);
        };

        const authTimeout = setTimeout(() => {
          cleanup(new Error('WebSocket/authentication timeout'));
        }, opts.timeout || 20000);

        socket.on('connect', () => {
          console.log(`✓ connected to ${node.url}`);
        });

        socket.on('connect_error', (err) => {
          clearTimeout(authTimeout);
          const errMsg = err && err.message ? err.message : String(err);
          cleanup(new Error(`WebSocket connect_error: ${errMsg}`));
        });

        socket.on('authentication', async (event) => {
          try {
            const payload = {
              serverSignature: Array.isArray(event?.signedData?.signature)
                ? event.signedData.signature
                : event?.signedData?.signature || null,
              originalPayload: event.payload || null
            };

            const privateKey = PrivateKey.fromString(privateKeyStr);
            const bytes = Buffer.from(JSON.stringify(payload));
            const userSig = privateKey.sign(bytes);

            socket.emit('authenticate', {
              signedData: { signedPayload: payload, userSignature: userSig },
              walletId
            });
          } catch (authErr) {
            clearTimeout(authTimeout);
            cleanup(new Error('Failed to sign authentication challenge: ' + (authErr && authErr.message ? authErr.message : authErr)));
          }
        });

        socket.on('authenticate', (res) => {
          clearTimeout(authTimeout);
          if (res && res.isValidSignature) {
            console.log(`🔐 Authenticated to ${node.url}`);
            resolve({ message: `account ${walletId} authenticated to node ${node.operator}.`, socket: { getSocket: () => socket } });
          } else {
            cleanup(new Error(`Authentication rejected by Smart Node ${node.url}`));
          }
        });

        socket.on('error', (e) => {
          console.warn(`Socket error from ${node.url}:`, e && e.message ? e.message : e);
        });

        socket.on('disconnect', (reason) => {
          console.log(`⚠️ WebSocket disconnected from ${node.url}:`, reason);
        });

        // start connection attempt
        socket.connect();
      });

      // Success — return authenticated socket wrapper
      return result;
    } catch (err) {
      console.warn(`Connection attempt failed for ${fullWsUrl}:`, err && err.message ? err.message : err);
      // backoff before trying next node (capped)
      const backoff = Math.min(500 * Math.pow(2, i), 3000);
      await new Promise((r) => setTimeout(r, backoff));
      continue; // try next node
    }
  }

  // all attempts failed
  throw new Error(`⚠️ All Smart Node WebSocket connections failed (nodes may be under maintenance).\n\n📋 Next steps:\n  1. Check Smart Node status: npm run test-nodes\n  2. Wait for maintenance to complete\n  3. When nodes are back: ./trade.sh\n\n💡 Follow HSuite announcements for maintenance windows.`);
}

function ensureBytes(input) {
  // input may be Array, base64 string, or Buffer/Uint8Array
  if (!input) throw new Error('No transaction bytes provided');
  if (Array.isArray(input)) return Uint8Array.from(input);
  if (Buffer.isBuffer(input)) return new Uint8Array(input);
  if (typeof input === 'string') {
    // try base64
    return Uint8Array.from(Buffer.from(input, 'base64'));
  }
  if (input instanceof Uint8Array) return input;
  throw new Error('Unrecognized transaction bytes format');
}

async function swapTransactionRequest(socket, senderId, swapObj, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    let done = false;
    const timer = setTimeout(() => {
      if (!done) { done = true; reject(new Error('swapPoolRequest timed out')); }
    }, timeoutMs);

    const onResponse = (resp) => {
      if (done) return;
      done = true; clearTimeout(timer);
      if (!resp || typeof resp !== 'object') return reject(new Error('Invalid response format'));
      if (resp.status === 'success') return resolve(resp.payload);
      const err = new Error(resp.error || resp.message || 'swapPoolRequest failed');
      err.response = resp; return reject(err);
    };

    socket.on('swapPoolRequest', onResponse);
    socket.emit('swapPoolRequest', { type: 'swapPoolRequest', senderId, swap: swapObj });
  });
}

async function swapTransactionExecute(socket, signedTransaction, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    let done = false;
    const timer = setTimeout(() => {
      if (!done) { done = true; reject(new Error('swapPoolExecute timed out')); }
    }, timeoutMs);

    const onResponse = (resp) => {
      if (done) return;
      done = true; clearTimeout(timer);
      if (!resp || typeof resp !== 'object') return reject(new Error('Invalid response format'));
      if (resp.status === 'success') return resolve(resp);
      const err = new Error(resp.error || resp.message || 'swapPoolExecute failed');
      err.response = resp; return reject(err);
    };

    socket.on('swapPoolExecute', onResponse);

    const txBytes = signedTransaction.toBytes();
    socket.emit('swapPoolExecute', { type: 'swapPoolExecute', transactionBytes: txBytes });
  });
}

async function main() {
  const argv = parseArgs();
  
  // MAINNET ONLY - Ignore any network override attempts
  const network = 'mainnet';
  
  const debugMode = Boolean(argv.debug || GLOBAL_DEBUG);
  const snipeMode_enabled = Boolean(argv.snipe);

  // operator credentials - mainnet only
  const operatorId = process.env.MAINNET_OPERATOR_ID;
  const operatorKey = process.env.MAINNET_OPERATOR_PRIVATE_KEY;

  if (!operatorId || !operatorKey) {
    console.error('❌ Missing operator credentials. Provide via environment or use the provided shell entrypoint.');
    await exitWithCode(1, debugMode);
    return;
  }

  // Validate wallet credentials and show balance
  let walletInfo;
  try {
    walletInfo = await validateWalletCredentials(network, operatorId, operatorKey);
  } catch (err) {
    console.error('❌ Wallet validation failed:', err && err.message ? err.message : err);
    await exitWithCode(1, debugMode);
    return;
  }

  let baseToken = argv.baseToken || process.env.BASE_TOKEN || '0.0.786931';
  const baseAmount = argv.baseAmount || process.env.BASE_AMOUNT || null;
  let swapToken = argv.swapToken || process.env.SWAP_TOKEN || 'HBAR';

  // Validate token inputs
  if (!isValidTokenString(baseToken)) {
    console.error("❌ Invalid base token. Must be 'HBAR' or a token id like 0.0.123456.");
    await exitWithCode(1, debugMode);
    return;
  }
  if (!isValidTokenString(swapToken)) {
    console.error("❌ Invalid swap token. Must be 'HBAR' or a token id like 0.0.123456.");
    await exitWithCode(1, debugMode);
    return;
  }

  // Normalize HBAR capitalization
  if (typeof baseToken === 'string' && baseToken.trim().toUpperCase() === 'HBAR') baseToken = 'HBAR';
  if (typeof swapToken === 'string' && swapToken.trim().toUpperCase() === 'HBAR') swapToken = 'HBAR';

  if (!baseAmount) {
    console.error('❌ Missing base amount. Pass --base-amount or set BASE_AMOUNT env var.');
    await exitWithCode(1, debugMode);
    return;
  }

  const baseDecimals = Number(argv.baseDecimals || process.env.BASE_DECIMALS || (baseToken === 'HBAR' ? 8 : 4));
  const swapDecimals = Number(argv.swapDecimals || process.env.SWAP_DECIMALS || (swapToken === 'HBAR' ? 8 : 4));

  // === Verify swap token is associated (already configured in trade.sh) ===
  try {
    const isAssociated = await checkTokenAssociation(network, operatorId, swapToken);
    if (!isAssociated) {
      console.error('❌ Swap token is not associated. Run the configuration stage in trade.sh first.');
      await exitWithCode(1, debugMode);
      return;
    }
  } catch (assocErr) {
    console.warn('⚠️ Could not verify token association:', assocErr && assocErr.message ? assocErr.message : assocErr);
  }

  console.log(`\n🔧 Network: ${network}`);
  console.log(`👤 Operator: ${operatorId}`);
  console.log(`💱 Swap: ${baseAmount} ${baseToken} -> ${swapToken}\n`);

  // === SNIPER MODE ===
  if (snipeMode_enabled) {
    return snipeMode_activation(network, operatorId, operatorKey, baseToken, baseAmount, swapToken, debugMode);
  }

  // === SINGLE SWAP MODE ===
  return executeSingleSwap(network, operatorId, operatorKey, baseToken, baseAmount, swapToken, debugMode);
}

async function snipeMode_activation(network, operatorId, operatorKey, baseToken, baseAmount, swapToken, debugMode) {
  console.log('\n' + '='.repeat(60));
  console.log('🎯 SNIPER MODE');
  console.log('='.repeat(60));
  console.log(`Monitoring for pool: ${baseToken} ↔ ${swapToken}`);
  console.log('Timeout: 3 hours | Press Ctrl+C to stop\n');

  const POLL_INTERVAL = 650; // 650ms
  const MAX_SNIPE_TIME = 5 * 60 * 60 * 1000; // 5 hours in milliseconds

  initCache();
  setupSignalHandlers();

  const snipeState = {
    startTime: Date.now(),
    attempts: 0
  };
  writeCache('snipe-state', snipeState);

  try {
    while (SNIPER_STATE.isRunning) {
      snipeState.attempts++;
      SNIPER_STATE.checkCount++;
      SNIPER_STATE.lastCheckTime = new Date().toISOString();

      const elapsed = Date.now() - snipeState.startTime;
      const elapsedSeconds = Math.floor(elapsed / 1000);
      const elapsedMinutes = Math.floor(elapsed / 60000);

      // Check if 3-hour timeout reached
      if (elapsed > MAX_SNIPE_TIME) {
        console.log(`\n⛔ 3-hour timeout reached. Stopping sniper.`);
        break;
      }

      try {
        // Get HTTP client for pool checking
        const httpClient = await smartNodeClient(network);

        // Check if pool exists
        console.log(`[${snipeState.attempts}] Checking pool availability (${elapsedMinutes}m elapsed)...`);
        const pool = await checkPoolLiquidity(httpClient, baseToken, swapToken);

        if (pool) {
          console.log(`\n✅ POOL FOUND! ${baseToken} ↔ ${swapToken}`);
          console.log(`Pool ID: ${pool.pool_id || 'unknown'}`);
          SNIPER_STATE.poolFound = true;
          writeCache('snipe-state', snipeState);

          // Pool found - proceed with swap
          try {
            console.log('\n🚀 Executing swap...');
            await executeSingleSwap(network, operatorId, operatorKey, baseToken, baseAmount, swapToken, debugMode);
            console.log('\n✅ SNIPE SUCCESSFUL!');
            break; // Exit sniper loop after successful swap
          } catch (swapErr) {
            console.error('\n❌ Swap failed:', swapErr && swapErr.message ? swapErr.message : swapErr);
            console.log('Retrying in next iteration...\n');
          }
        } else {
          // Pool not found
          console.log(`  ❌ Pool not found (${elapsedSeconds}s elapsed, ${snipeState.attempts} checks)`);
        }
      } catch (checkErr) {
        console.warn(`  ⚠️ Check failed:`, checkErr && checkErr.message ? checkErr.message : checkErr);
      }

      // Wait before next check (unless we're stopping)
      if (SNIPER_STATE.isRunning) {
        console.log(`⏱️ Next check in 650ms...\n`);
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
      }
    }
  } finally {
    cleanCache();
  }
}

async function executeSingleSwap(network, operatorId, operatorKey, baseToken, baseAmount, swapToken, debugMode) {
  // --- create HTTP client (read-only operations)
  const httpClient = await smartNodeClient(network);
  console.log('✅ Smart Node HTTP OK (read-only) @', httpClient.defaults.baseURL);

  // --- create and authenticate websocket
  const connection = await smartNodeSocket(network, operatorId, operatorKey);
  const socket = connection.socket.getSocket('gateway');

  // build swap object (exact-input swap: spend baseAmount)
  const baseDecimals = Number(process.env.BASE_DECIMALS || (baseToken === 'HBAR' ? 8 : 4));
  const swapDecimals = Number(process.env.SWAP_DECIMALS || (swapToken === 'HBAR' ? 8 : 4));

  const swapObj = {
    baseToken: { details: { id: baseToken, symbol: baseToken, decimals: baseDecimals }, amount: { value: new Decimal(baseAmount) } },
    swapToken: { details: { id: swapToken, symbol: swapToken, decimals: swapDecimals }, amount: { value: null } }
  };

  try {
    // 1) Request unsigned swap transaction from Smart Node
    console.log('📝 Requesting swap transaction from Smart Node...');
    const req = await swapTransactionRequest(socket, operatorId, swapObj);
    if (!req || !req.transaction) throw new Error('Smart Node did not return a transaction');

    // 2) Deserialize, sign locally with operator private key
    const txBytes = ensureBytes(req.transaction);
    const tx = Transaction.fromBytes(txBytes);
    const signed = tx.sign(PrivateKey.fromString(operatorKey));
    console.log('✍️ Transaction signed locally');

    // 3) Execute signed transaction through Smart Node
    console.log('🚀 Executing signed transaction via Smart Node...');
    const exec = await swapTransactionExecute(socket, signed);

    console.log('\n🎉 SWAP SUCCESS');
    console.log('Result:', JSON.stringify(exec, null, 2));
  } catch (err) {
    console.error('\n❌ Swap failed:', err && err.stack ? err.stack : (err.message || err));
    if (err.response) console.error('Server response:', err.response);
    await exitWithCode(1, debugMode);
    return;
  } finally {
    try {
      const rawSocket = socket.getSocket ? socket.getSocket('gateway') : socket;
      rawSocket.removeAllListeners();
      rawSocket.disconnect();
    } catch (e) { /* ignore */ }
  }

  // If we're in debug mode keep the process alive so user can inspect logs
  if (debugMode) {
    console.log('\n[DEBUG] Run completed — process will pause for inspection.');
    await waitForEnter();
  }
}

// ============ ENTRY POINT ============
main().catch(async (err) => {
  console.error('Fatal error:', err && err.message ? err.message : err);
  if (GLOBAL_DEBUG || process.env.DEBUG) {
    await waitForEnter();
  }
  process.exit(1);
});

// Sniper mode: continuously monitor for pool and execute swap when found