#!/usr/bin/env node

/**
 * Silksuite DEX Trading Client - Terminal UI
 * Interactive CLI for wallet validation, token association, and swap execution
 * MAINNET ONLY
 */

const readline = require('readline');
const { Client, AccountId, PrivateKey, TokenId, TokenAssociateTransaction } = require('@hashgraph/sdk');
const axios = require('axios');
const { spawn } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise((resolve) => {
  rl.question(prompt, resolve);
});

const questionHidden = (prompt) => new Promise((resolve) => {
  process.stdout.write(prompt);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  
  let password = '';
  process.stdin.on('data', (char) => {
    if (char === '\n' || char === '\r' || char === '\u0004') {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write('\n');
      resolve(password);
    } else if (char === '\u0003') {
      process.exit();
    } else if (char === '\u007f') { // backspace
      password = password.slice(0, -1);
    } else {
      password += char;
    }
  });
});

// === Step 1: Validate Wallet Credentials ===
async function validateWalletCredentials(accountId, privateKeyStr) {
  console.log('\n' + '='.repeat(50));
  console.log('Step 1: Validating Wallet Credentials');
  console.log('='.repeat(50));
  
  try {
    console.log('🔍 Validating credentials...');
    
    // Parse and validate private key
    const privKey = PrivateKey.fromString(privateKeyStr);
    const pubKey = privKey.publicKey;
    
    console.log(`📍 Account ID: ${accountId}`);
    console.log(`📍 Public Key: ${pubKey.toString()}`);
    
    // Fetch balance from Hedera Mirror Node
    try {
      const mirror = axios.create({
        baseURL: 'https://mainnet-public.mirrornode.hedera.com',
        timeout: 10000
      });
      
      const resp = await mirror.get(`/api/v1/accounts/${accountId}`);
      if (resp && resp.data && resp.data.balance) {
        const tinybars = Number(resp.data.balance.balance || 0);
        const hbar = (tinybars / 1e8).toFixed(8);
        console.log(`💰 HBAR Balance: ${hbar} HBAR`);
        
        if (tinybars < 0.1e8) {
          console.warn('⚠️  WARNING: Balance <0.1 HBAR (may be low for swap fees)');
        }
      }
    } catch (e) {
      console.log('ℹ️  Could not fetch balance (network issue), but credentials appear valid');
    }
    
    console.log('✅ Credentials validated\n');
    return { accountId, privKey };
  } catch (err) {
    console.error(`❌ Invalid credentials: ${err.message || err}`);
    throw err;
  }
}

// === Step 2: Configure Swap Parameters ===
async function configureSwapParameters() {
  console.log('\n' + '='.repeat(50));
  console.log('Step 2: Configure Swap Parameters');
  console.log('='.repeat(50));
  
  // Base token
  let baseToken = '0.0.786931';
  const baseInput = await question(`Base token (HBAR or token id) [${baseToken}]: `);
  if (baseInput.trim()) {
    baseToken = baseInput.trim();
  }
  
  // Validate base token
  if (!isValidToken(baseToken)) {
    throw new Error(`Invalid base token: ${baseToken}`);
  }
  
  // Swap token
  let swapToken = 'HBAR';
  const swapInput = await question(`Swap token (HBAR or token id) [${swapToken}]: `);
  if (swapInput.trim()) {
    swapToken = swapInput.trim();
  }
  
  // Validate swap token
  if (!isValidToken(swapToken)) {
    throw new Error(`Invalid swap token: ${swapToken}`);
  }
  
  // Amount
  const amountInput = await question(`Amount to spend (${baseToken}): `);
  if (!amountInput.trim()) {
    throw new Error('Amount is required');
  }
  const baseAmount = amountInput.trim();
  
  // Swap mode
  console.log('\nSwap Mode?');
  console.log('  1) Regular Swap (execute immediately)');
  console.log('  2) Snipe Mode (monitor pool for 5 hours, execute when found)');
  
  const modeInput = await question('Choose mode [1]: ');
  const snipeMode = modeInput.trim() === '2';
  
  if (snipeMode) {
    console.log('✅ Snipe mode enabled (will monitor for pool and execute)');
  } else {
    console.log('✅ Regular swap mode enabled (execute immediately)');
  }
  
  return { baseToken, swapToken, baseAmount, snipeMode };
}

// === Step 3: Ensure Token Associations ===
async function ensureTokenAssociations(accountId, privKey, baseToken, swapToken) {
  console.log('\n' + '='.repeat(50));
  console.log('Step 3: Ensuring Token Associations');
  console.log('='.repeat(50));
  
  const client = Client.forMainnet();
  client.setOperator(AccountId.fromString(accountId), privKey);
  
  try {
    // Process base token
    await ensureSingleTokenAssociation(client, accountId, privKey, baseToken, 'Base token');
    
    // Process swap token
    await ensureSingleTokenAssociation(client, accountId, privKey, swapToken, 'Swap token');
    
    console.log('\n✅ All tokens confirmed associated - ready for swap execution\n');
  } catch (err) {
    console.error(`❌ Token association failed: ${err.message || err}`);
    throw err;
  } finally {
    await client.close();
  }
}

async function ensureSingleTokenAssociation(client, accountId, privKey, tokenStr, tokenName) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Processing: ${tokenName}`);
  console.log('='.repeat(50));
  
  if (tokenStr.toUpperCase() === 'HBAR') {
    console.log(`✅ ${tokenName} is HBAR (no association needed)`);
    return;
  }
  
  console.log(`🔍 Checking ${tokenName} association: ${tokenStr}`);
  
  try {
    // Check via Mirror Node
    console.log('  Querying Mirror Node...');
    const mirror = axios.create({
      baseURL: 'https://mainnet-public.mirrornode.hedera.com',
      timeout: 10000
    });
    
    const resp = await mirror.get(`/api/v1/accounts/${accountId}`);
    const tokens = resp.data.balance?.tokens || [];
    const isAssociated = tokens.some(t => t.token_id === tokenStr);
    
    if (isAssociated) {
      console.log(`✅ ${tokenName} already associated`);
      return;
    }
    
    console.log('  Token not yet associated - will proceed with association');
  } catch (e) {
    console.warn(`⚠️  Mirror Node check failed: ${e.message || e}`);
    console.log('  Proceeding with association attempt anyway...');
  }
  
  // Not associated - create association
  try {
    console.log(`📝 Creating TokenAssociateTransaction...`);
    const tokenId = TokenId.fromString(tokenStr);
    
    const txn = new TokenAssociateTransaction()
      .setAccountId(AccountId.fromString(accountId))
      .addTokenId(tokenId);
    
    console.log('  Freezing transaction with mainnet...');
    const frozenTxn = await txn.freezeWith(client);
    
    console.log(`🔑 Signing with provided private key...`);
    const signedTxn = await frozenTxn.sign(privKey);
    console.log('  ✅ Transaction signed');
    
    console.log(`🚀 Submitting to Hedera network...`);
    const response = await signedTxn.execute(client);
    console.log(`  Transaction ID: ${response.transactionId}`);
    
    console.log(`⏳ Waiting for receipt...`);
    const receipt = await response.getReceipt(client);
    
    if (receipt.status._code === 0 || receipt.status.toString() === 'SUCCESS') {
      console.log(`✅ ${tokenName} successfully associated (txId: ${response.transactionId})`);
    } else if (receipt.status.toString().includes('TOKEN_ALREADY_ASSOCIATED')) {
      console.log(`✅ ${tokenName} already associated`);
    } else {
      throw new Error(`Association failed with status: ${receipt.status}`);
    }
  } catch (e) {
    if (e.message && e.message.includes('TOKEN_ALREADY_ASSOCIATED')) {
      console.log(`✅ ${tokenName} already associated`);
      return;
    }
    throw e;
  }
}

// === Step 4: Execute Swap ===
async function executeSwap(accountId, privKey, baseToken, baseAmount, swapToken, snipeMode, debugMode) {
  console.log('\n' + '='.repeat(50));
  console.log('Step 4: Executing Swap');
  console.log('='.repeat(50));
  
  // Set environment variables
  process.env.MAINNET_OPERATOR_ID = accountId;
  process.env.MAINNET_OPERATOR_PRIVATE_KEY = privKey.toString();
  process.env.BASE_TOKEN = baseToken;
  process.env.BASE_AMOUNT = baseAmount;
  process.env.SWAP_TOKEN = swapToken;
  process.env.DEBUG = debugMode ? '1' : '0';
  
  // Build command
  const args = ['src/trade.js', '--base-token', baseToken, '--base-amount', baseAmount, '--swap-token', swapToken];
  if (snipeMode) {
    args.push('--snipe');
  }
  
  // Execute trade engine
  return new Promise((resolve, reject) => {
    const child = spawn('node', args, { stdio: 'inherit' });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Trade engine exited with code ${code}`));
      }
    });
    
    child.on('error', (err) => {
      reject(err);
    });
  });
}

// === Utility Functions ===
function isValidToken(token) {
  if (token.toUpperCase() === 'HBAR') return true;
  if (/^\d+\.\d+\.\d+$/.test(token)) return true;
  return false;
}

// === Main Flow ===
async function main() {
  try {
    console.log('\n');
    console.log('╔' + '='.repeat(48) + '╗');
    console.log('║' + '  Silksuite DEX Trading Client - MAINNET ONLY  '.padEnd(50) + '║');
    console.log('╚' + '='.repeat(48) + '╝');
    
    // Get credentials
    const accountId = await question('Hedera account ID (e.g. 0.0.123456): ');
    if (!accountId.trim()) {
      throw new Error('Account ID is required');
    }
    
    const privKeyStr = await questionHidden('Private key (hidden): ');
    if (!privKeyStr.trim()) {
      throw new Error('Private key is required');
    }
    
    // Step 1: Validate credentials
    const { privKey } = await validateWalletCredentials(accountId.trim(), privKeyStr.trim());
    
    // Step 2: Configure swap
    const { baseToken, swapToken, baseAmount, snipeMode } = await configureSwapParameters();
    
    // Step 3: Ensure token associations
    await ensureTokenAssociations(accountId.trim(), privKey, baseToken, swapToken);
    
    // Step 4: Execute swap
    await executeSwap(accountId.trim(), privKey, baseToken, baseAmount, swapToken, snipeMode, false);
    
    console.log('\n✅ Trading flow completed successfully');
    rl.close();
  } catch (err) {
    console.error(`\n❌ Error: ${err.message || err}`);
    rl.close();
    process.exit(1);
  }
}

main();
