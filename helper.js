const mempoolJS = require("@mempool/mempool.js");

const fetchBlockTxIds = async (network, hash) => {
  const { bitcoin: { blocks } } = mempoolJS({
    hostname: 'mempool.space',
    network: network // 'testnet' | 'mainnet'
  });

  return blocks.getBlockTxids({ hash });
}

module.exports = fetchBlockTxIds;