/**
 * Sign and broadcast a registerPegoutTransaction call to the RSK Bridge
 * using eth_sendRawTransaction (the key is held locally, NOT by the node).
 *
 * Fetches the btcTxHash, height and pmt for the given pegout btc transaction and
 * sends them to the Bridge. The RSK node must have RSKIP643 active.
 *
 * Requires RPC_URL and PRIVATE_KEY (or SENDER_SEED) in .env.
 *
 * Usage:
 *   node tool/registerPegoutTransaction.js <mainnet|testnet|regtest> <btcTransactionHash>           # dry run: prints the raw signed tx
 *   node tool/registerPegoutTransaction.js <mainnet|testnet|regtest> <btcTransactionHash> --send    # also broadcasts via eth_sendRawTransaction
 */

const { getInformationReadyForRegisterPegoutTransaction } = require('./getInformationReadyForRegisterPegoutTransaction');
const { parseBridgeRegisterBtcCliArgs } = require('./bitcoin/registerBtcCliArgs');
const { getProvider, getWallet, isBtcTxAlreadyProcessed, getBtcTxHashProcessedHeight, sendBridgeCall } = require('./bridge-utils');

const USAGE = 'Usage: node tool/registerPegoutTransaction.js <mainnet|testnet|regtest> <btcTransactionHash> [--send]';

const main = async () => {
    const { network: btcNetwork, txHash: btcTxHash, send } = parseBridgeRegisterBtcCliArgs(
        process.argv,
        USAGE,
    );
    const provider = getProvider();
    const wallet = getWallet(provider);

    try {
        let isAlreadyRegistered = await isBtcTxAlreadyProcessed(provider, btcTxHash);
        if (isAlreadyRegistered) {
            const blockRegistration = await getBtcTxHashProcessedHeight(provider, btcTxHash);
            console.log(`Btc transaction ${btcTxHash} was already registered in the Bridge at block ${blockRegistration}. Nothing to do.`);
            return;
        }

        const { btcTxHash: btcTxHashArg, height, pmtSerialized } =
            await getInformationReadyForRegisterPegoutTransaction(btcNetwork, btcTxHash);

        const receipt = await sendBridgeCall({
            method: 'registerPegoutTransaction',
            args: [btcTxHashArg, height, pmtSerialized],
            send,
            provider,
            wallet,
        });

        if (!send) {
            return;
        }

        if (receipt.status !== 1) {
            console.error('The RSK transaction reverted; the pegout was not registered.');
            process.exitCode = 1;
            return;
        }

        // The Bridge does not revert when it rejects a pegout (no pending UTXOs, SVP fund tx,
        // already processed, invalid merkle root): it logs a warning and returns. A successful
        // receipt therefore doesn't mean the transaction was registered.
        isAlreadyRegistered = await isBtcTxAlreadyProcessed(provider, btcTxHash);
        if (isAlreadyRegistered) {
            console.log(`Btc transaction ${btcTxHash} is now registered in the Bridge.`);
        } else {
            console.warn(`The RSK transaction succeeded but the Bridge did not register ${btcTxHash}.`);
            process.exitCode = 1;
        }
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
