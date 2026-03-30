const bitcoin = require('bitcoinjs-lib');

const getWtxid = async (rawTx) => {
    const tx = bitcoin.Transaction.fromHex(rawTx);
    const wtxid = tx.getHash(true).reverse().toString('hex');
    return wtxid;
}

module.exports = { getWtxid };