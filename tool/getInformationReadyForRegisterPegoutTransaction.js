const path = require('path');
require('dotenv').config({
    path: path.join(__dirname, '..', '.env'),
    quiet: true,
});

const pmtBuilder = require('../index');
const { getBitcoinTransactionDataForPmt } = require('./bitcoin/transactionDataForPmt');
const { parseBridgeRegisterBtcCliArgs } = require('./bitcoin/registerBtcCliArgs');

/**
 * Gets the arguments for the Bridge `registerPegoutTransaction(bytes32 btcTxHash, int height, bytes pmtSerialized)`.
 *
 * The PMT is always built from block txids, even for SegWit transactions: the Bridge
 * checks that `btcTxHash` (a txid) is a leaf of the PMT, so a wtxid-based tree would
 * never validate. The txid tree's root is checked against the block header merkle
 * root, so no coinbase registration is needed.
 *
 * @param {'mainnet'|'testnet'|'regtest'} network
 * @param {string} txHash - pegout txid
 * @returns {Promise<{ btcTxHash: string, height: number, pmtSerialized: string }>}
 */
const getInformationReadyForRegisterPegoutTransaction = async (network, txHash) => {
    const txid = txHash.toLowerCase();
    console.log(`Fetching transaction ${txid} on ${network}...`);

    const { blockHeight, blockTxids } = await getBitcoinTransactionDataForPmt(txid, network);

    console.log(
        `Found ${blockTxids.length} transactions in block at height ${blockHeight}. Building txid-based PMT...`,
    );

    const resultPmt = pmtBuilder.buildPMT(blockTxids, txid);

    return {
        btcTxHash: `0x${txid}`,
        height: blockHeight,
        pmtSerialized: `0x${resultPmt.hex}`,
    };
};

if (require.main === module) {
    (async () => {
        try {
            const { network, txHash } = parseBridgeRegisterBtcCliArgs(
                process.argv,
                'Usage: node tool/getInformationReadyForRegisterPegoutTransaction.js <mainnet|testnet|regtest> <btcTransactionHash>',
            );

            const informationReadyForRegisterPegoutTransaction =
                await getInformationReadyForRegisterPegoutTransaction(network, txHash);

            console.log(
                'Transaction Information ready for registerPegoutTransaction: ',
                informationReadyForRegisterPegoutTransaction,
            );
        } catch (e) {
            console.log(e);
        }
    })();
}

module.exports = {
    getInformationReadyForRegisterPegoutTransaction,
};
