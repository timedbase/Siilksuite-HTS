#!/usr/bin/env node
'use strict';

const axios = require('axios');
const io = require('socket.io-client');

// Smart Node configuration
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

async function testNode(node) {
  console.log(`\n📍 Testing ${node.url} (${node.operator})`);
  console.log('─'.repeat(60));

  // Test 1: HTTP connectivity
  console.log('  [1/3] HTTP GET /pools/list...');
  try {
    const httpClient = axios.create({ baseURL: node.url, timeout: 5000 });
    const resp = await httpClient.get('/pools/list');
    if (resp && resp.status === 200) {
      console.log('    ✅ HTTP OK (status 200)');
    } else {
      console.log(`    ⚠️ HTTP status ${resp.status}`);
    }
  } catch (err) {
    console.log(`    ❌ HTTP failed: ${err.message || err}`);
  }

  // Test 2: WebSocket connection
  console.log('  [2/3] WebSocket to wss://... /gateway');
  const wsUrl = node.url.replace(/^https?/, (m) => (m === 'https' ? 'wss' : 'ws'));
  const fullWsUrl = `${wsUrl}/gateway`;
  console.log(`        URL: ${fullWsUrl}`);

  try {
    const wsResult = await new Promise((resolve, reject) => {
      const socket = io(fullWsUrl, {
        transports: ['websocket'],
        query: { wallet: '0.0.1' },
        reconnection: false,
        timeout: 5000
      });

      const timer = setTimeout(() => {
        socket.disconnect();
        reject(new Error('Connection timeout (5s)'));
      }, 5000);

      socket.on('connect', () => {
        clearTimeout(timer);
        socket.disconnect();
        resolve(true);
      });

      socket.on('connect_error', (err) => {
        clearTimeout(timer);
        socket.disconnect();
        reject(new Error(err && err.message ? err.message : String(err)));
      });

      socket.on('error', (err) => {
        clearTimeout(timer);
        socket.disconnect();
        reject(new Error(err && err.message ? err.message : String(err)));
      });

      socket.connect();
    });

    if (wsResult) {
      console.log('    ✅ WebSocket OK (connected)');
    }
  } catch (err) {
    console.log(`    ❌ WebSocket failed: ${err.message || err}`);
  }

  // Test 3: Mirror Node connectivity
  console.log('  [3/3] Mirror Node /api/v1/accounts/0.0.1');
  try {
    const mirrorClient = axios.create({ baseURL: 'https://mainnet-public.mirrornode.hedera.com', timeout: 5000 });
    const resp = await mirrorClient.get('/api/v1/accounts/0.0.1');
    if (resp && resp.status === 200) {
      console.log('    ✅ Mirror Node OK (status 200)');
    } else {
      console.log(`    ⚠️ Mirror Node status ${resp.status}`);
    }
  } catch (err) {
    console.log(`    ❌ Mirror Node failed: ${err.message || err}`);
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 HSuite Smart Node & Hedera Mirror Node Connectivity Test');
  console.log('='.repeat(60));

  const network = 'mainnet';
  const nodeList = nodes[network];

  console.log(`\nNetwork: ${network}`);
  console.log(`Testing ${nodeList.length} Smart Nodes...`);

  for (const node of nodeList) {
    try {
      await testNode(node);
    } catch (err) {
      console.error(`Unexpected error testing ${node.url}:`, err);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  console.log('\nIf HTTP works but WebSocket fails:');
  console.log('  • Check firewall rules (WSS uses TCP 443)');
  console.log('  • Verify no corporate proxy is blocking WebSocket upgrades');
  console.log('  • Try from a different network to isolate the issue');
  console.log('\nIf both fail:');
  console.log('  • Smart Nodes may be temporarily unavailable');
  console.log('  • Check node health at: https://mainnet-sn1.hsuite.network/health');
  console.log('\nFor Mirror Node issues:');
  console.log('  • Usually a network connectivity problem');
  console.log('  • Try: curl https://mainnet-public.mirrornode.hedera.com/api/v1/accounts/0.0.1\n');
}

main().catch(err => {
  console.error('\nFATAL:', err.message);
  process.exit(1);
});
