const path = require('path');
require('dotenv').config({
    path: path.join(__dirname, '..', '.env'),
    quiet: true,
});

const bitcoinJs = require('bitcoinjs-lib');
const merkleLib = require('merkle-lib');
const { createMempoolBitcoinClients } = require('./mempool-api-client');
const { createBitcoindBitcoinClients } = require('./bitcoin/bitcoindBitcoinClients');
const {
    sleep,
    getTransactionWithRetry,
    getBlockInfoByTransactionHash,
    REQUEST_DELAY_MS,
} = require('./pmt-builder-utils');
const pmtBuilder = require('../index');
const { getTransactionsFromBitcoindForTxids } = require('./bitcoin/bitcoindData');

function updateProgress(currentIndex, totalCount) {
    process.stdout.write(`Fetching transactions: ${currentIndex}/${totalCount}\r`);
}

function clearProgress() {
    process.stdout.write('\x1b[2K\r');
}

/**
 * @param {Object} transactionsClient - must provide `getTxHex({ txid })`.
 * @param {string[]} txIds
 * @returns {Promise<bitcoinJs.Transaction[]>}
 */
const getAllTxs = async (transactionsClient, txIds) => {
    if (txIds.length === 0) {
        console.log('No transactions found in the block.');
        return [];
    }

    const txs = [];
    console.log(
        `Found ${txIds.length} transactions. Fetching details with ${REQUEST_DELAY_MS}ms delay per request...`,
    );

    const totalTxs = txIds.length;

    for (let i = 0; i < txIds.length; i++) {
        const txId = txIds[i];
        updateProgress(i + 1, totalTxs);
        const tx = await getTransactionWithRetry(transactionsClient, txId);
        txs.push(bitcoinJs.Transaction.fromHex(tx));
        if (i < txIds.length - 1) {
            await sleep();
        }
    }

    clearProgress();
    console.log(`\nFinished fetching ${totalTxs} transactions.`);

    return txs;
};

/**
 * @param {string} blockHash
 * @param {string[]} blockTxids
 * @param {bitcoinJs.Transaction} coinbaseTx
 * @param {bitcoinJs.Transaction[]} txs - same order as blockTxids
 */
const buildRegisterCoinbaseResult = (blockHash, blockTxids, coinbaseTx, txs) => {
    if (!coinbaseTx.ins || coinbaseTx.ins.length === 0) {
        throw new Error('Coinbase transaction has no inputs.');
    }
    const witness = coinbaseTx.ins[0].witness;
    if (!witness || witness.length === 0) {
        throw new Error(
            'Coinbase has no witness data (expected SegWit coinbase with witness reserved value at witness[0]). Pre-SegWit or malformed coinbase.',
        );
    }
    const witnessReservedValue = Buffer.from(witness[0]).toString('hex');

    const coinbaseTxWithoutWitness = coinbaseTx.clone();
    coinbaseTxWithoutWitness.stripWitnesses();
    const coinbaseTxHashWithoutWitness = coinbaseTxWithoutWitness.getId();

  
    if (!txs || txs.length === 0) {
        throw new Error('Block has no transactions for witness merkle root computation.');
    }
    const hashesWithWitness = [
        Buffer.alloc(32, 0),
        ...txs.slice(1).map((tx) => Buffer.from(tx.getHash(true))),
    ];
    const witnessMerkleTree = merkleLib(hashesWithWitness, bitcoinJs.crypto.hash256);
    const witnessMerkleRootBuffer = Buffer.from(witnessMerkleTree[witnessMerkleTree.length - 1]);
    witnessMerkleRootBuffer.reverse();

    const { hex: coinbasePmt } = pmtBuilder.buildPMT(blockTxids, coinbaseTxHashWithoutWitness);

    return {
        btcTxSerialized: `0x${coinbaseTxWithoutWitness.toHex()}`,
        btcBlockHash: `0x${blockHash}`,
        pmtSerialized: `0x${coinbasePmt}`,
        witnessMerkleRoot: `0x${witnessMerkleRootBuffer.toString('hex')}`,
        witnessReservedValue: `0x${witnessReservedValue}`,
    };
};

const getInformationReadyForRegisterBtcCoinbaseTransactionFromMempool = async (network, txHash) => {
    const { blocks, transactions } = createMempoolBitcoinClients(network);

    const { blockHash, blockTxids } = await getBlockInfoByTransactionHash(blocks, transactions, txHash, {
        unconfirmedBlockDetail: 'in mempool.space response',
    });

    const txs = await getAllTxs(transactions, blockTxids);
    const coinbaseTx = txs[0];
    if (!coinbaseTx) {
        throw new Error('Block has no coinbase transaction.');
    }

    return buildRegisterCoinbaseResult(blockHash, blockTxids, coinbaseTx, txs);
};

const getInformationReadyForRegisterBtcCoinbaseTransactionFromBitcoind = async (txHash) => {
    const { blocks, transactions } = createBitcoindBitcoinClients();
    const { blockHash, blockTxids } = await getBlockInfoByTransactionHash(blocks, transactions, txHash, {
        unconfirmedBlockDetail: 'from Bitcoin Core (tx not confirmed, wrong network, or txindex disabled)',
    });

    const coinbaseTxId = blockTxids[0];
    const rawCoinbaseBtcTx = await transactions.getTxHex({ txid: coinbaseTxId });
    const coinbaseTx = bitcoinJs.Transaction.fromHex(rawCoinbaseBtcTx);

    const restIds = blockTxids.slice(1);
    console.log(
        `Found ${blockTxids.length} transactions. Fetching ${restIds.length} non-coinbase from local bitcoind (no delay)...`,
    );
    if (blockTxids.length > 0) {
        updateProgress(1, blockTxids.length);
    }
    const restTxs = await getTransactionsFromBitcoindForTxids(transactions, restIds, (cur) => {
        updateProgress(1 + cur, blockTxids.length);
    });
    clearProgress();
    console.log(`\nFinished fetching ${blockTxids.length} transactions.`);

    const txs = [coinbaseTx, ...restTxs];

    return buildRegisterCoinbaseResult(blockHash, blockTxids, coinbaseTx, txs);
};

const getInformationReadyForRegisterBtcCoinbaseTransaction = async (network, txHash) => {
    if (network === 'regtest') {
        return getInformationReadyForRegisterBtcCoinbaseTransactionFromBitcoind(txHash);
    }
    if (network === 'mainnet' || network === 'testnet') {
        return getInformationReadyForRegisterBtcCoinbaseTransactionFromMempool(network, txHash);
    }
    throw new Error(
        `Unsupported network "${network}". Use mainnet, testnet, or regtest.`,
    );
};

(async () => {
    try {
        const network = process.argv[2];
        const txHash = process.argv[3];

        if (!network || !txHash) {
            console.log(
                'Usage: node tool/getInformationReadyForRegisterBtcCoinbaseTransaction.js <mainnet|testnet|regtest> <btcTxHashInBlock>',
            );
            process.exit(1);
        }

        const informationReadyForRegisterBtcCoinbaseTransaction =
            await getInformationReadyForRegisterBtcCoinbaseTransaction(network, txHash);

        console.log(
            'Transaction Information ready for registerBtcCoinbaseTransaction: ',
            informationReadyForRegisterBtcCoinbaseTransaction,
        );
    } catch (e) {
        console.log(e);
    }
})();
