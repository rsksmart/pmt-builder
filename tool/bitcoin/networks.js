const MEMPOOL_NETWORKS = new Set(['mainnet', 'testnet']);

function isMempoolNetwork(network) {
    return MEMPOOL_NETWORKS.has(network);
}

module.exports = { MEMPOOL_NETWORKS, isMempoolNetwork };
