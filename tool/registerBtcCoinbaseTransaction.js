/**
 * Sign and broadcast a registerBtcCoinbaseTransaction call to the RSK Bridge
 * using eth_sendRawTransaction (the key is held locally, NOT by the node).
 *
 * Takes the txid of any confirmed transaction in the target block; the tool resolves
 * the block and registers that block's coinbase. A block's coinbase must be registered
 * before a SegWit transaction from it can be registered with registerBtcTransaction.
 *
 * Requires RPC_URL and PRIVATE_KEY (or SENDER_SEED) in .env.
 *
 * Usage:
 *   node tool/registerBtcCoinbaseTransaction.js <mainnet|testnet|regtest> <btcTxHashInBlock>           # dry run: prints the raw signed tx
 *   node tool/registerBtcCoinbaseTransaction.js <mainnet|testnet|regtest> <btcTxHashInBlock> --send    # also broadcasts via eth_sendRawTransaction
 */

const { getInformationReadyForRegisterBtcCoinbaseTransaction } = require('./getInformationReadyForRegisterBtcCoinbaseTransaction');
const { parseBridgeRegisterBtcCliArgs } = require('./bitcoin/registerBtcCliArgs');
const { getProvider, getWallet, hasCoinbaseInformation, sendBridgeCall } = require('./bridge-utils');

const USAGE = 'Usage: node tool/registerBtcCoinbaseTransaction.js <mainnet|testnet|regtest> <btcTxHashInBlock> [--send]';

const main = async () => {
    const { network: btcNetwork, txHash: btcTxHash, send } = parseBridgeRegisterBtcCliArgs(
        process.argv,
        USAGE,
    );
    const provider = getProvider();
    const wallet = getWallet(provider);

    try {
        const {
            btcTxSerialized,
            btcBlockHash,
            pmtSerialized,
            witnessMerkleRoot,
            witnessReservedValue,
        } = await getInformationReadyForRegisterBtcCoinbaseTransaction(btcNetwork, btcTxHash);

        const isAlreadyRegistered = await hasCoinbaseInformation(provider, btcBlockHash);
        if (isAlreadyRegistered) {
            console.log(`Coinbase information for block ${btcBlockHash} is already registered in the Bridge. Nothing to do.`);
            return;
        }

        await sendBridgeCall({
            method: 'registerBtcCoinbaseTransaction',
            args: [btcTxSerialized, btcBlockHash, pmtSerialized, witnessMerkleRoot, witnessReservedValue],
            send,
            provider,
            wallet,
        });
    } finally {
        provider.destroy();
    }
};

if (require.main === module) {
    main().catch((e) => {
        console.error(e);
        process.exit(1);
    });
}

module.exports = { main };
