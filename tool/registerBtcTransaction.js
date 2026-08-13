/**
 * Sign and broadcast a registerBtcTransaction call to the RSK Bridge
 * using eth_sendRawTransaction (the key is held locally, NOT by the node).
 *
 * Fetches the tx, height and pmt for the given btc transaction and sends them
 * to the Bridge.
 *
 * Requires RPC_URL and PRIVATE_KEY (or SENDER_SEED) in .env.
 *
 * Usage:
 *   node tool/registerBtcTransaction.js <mainnet|testnet|regtest> <btcTransactionHash>           # dry run: prints the raw signed tx
 *   node tool/registerBtcTransaction.js <mainnet|testnet|regtest> <btcTransactionHash> --send    # also broadcasts via eth_sendRawTransaction
 */

const { getInformationReadyForRegisterBtcTransaction } = require('./getInformationReadyForRegisterBtcTransaction');
const { parseBridgeRegisterBtcCliArgs } = require('./bitcoin/registerBtcCliArgs');
const { getProvider, getWallet, isBtcTxAlreadyProcessed, getBtcTxHashProcessedHeight, sendBridgeCall } = require('./bridge-utils');

const USAGE = 'Usage: node tool/registerBtcTransaction.js <mainnet|testnet|regtest> <btcTransactionHash> [--send]';

const main = async () => {
    const { network: btcNetwork, txHash: btcTxHash, send } = parseBridgeRegisterBtcCliArgs(
        process.argv,
        USAGE,
    );
    const provider = getProvider();
    const wallet = getWallet(provider);

    try {
        const isAlreadyRegistered = await isBtcTxAlreadyProcessed(provider, btcTxHash);
        if (isAlreadyRegistered) {
            const blockRegistration = await getBtcTxHashProcessedHeight(provider, btcTxHash);
            console.log(`Btc transaction ${btcTxHash} was already registered in the Bridge at block ${blockRegistration}. Nothing to do.`);
            return;
        }

        const { tx, height, pmt } = await getInformationReadyForRegisterBtcTransaction(
            btcNetwork,
            btcTxHash,
        );

        await sendBridgeCall({
            method: 'registerBtcTransaction',
            args: [tx, height, pmt],
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
