const { isMempoolNetwork } = require('./networks');

const TXID_HEX_RE = /^[0-9a-fA-F]{64}$/;

/**
 * Pure validation for Bridge register-* BTC CLI scripts (no I/O, no `process.exit`).
 *
 * @param {string[]} argv - typically `process.argv`
 * @returns {{ ok: true, network: string, txHash: string } | { ok: false, reason: 'missing_args'|'bad_network'|'bad_txid', network?: string }}
 */
function validateBridgeRegisterBtcCliArgs(argv) {
    const network = argv[2];
    const txHash = argv[3];

    if (!network || !txHash) {
        return { ok: false, reason: 'missing_args' };
    }

    if (!isMempoolNetwork(network) && network !== 'regtest') {
        return { ok: false, reason: 'bad_network', network };
    }

    if (!TXID_HEX_RE.test(txHash)) {
        return { ok: false, reason: 'bad_txid' };
    }

    return { ok: true, network, txHash };
}

/**
 * Validates `argv` for Bridge register-* BTC CLI scripts (network + txid).
 * On failure: prints usage / errors and calls `process.exit(1)`.
 *
 * @param {string[]} argv - typically `process.argv`
 * @param {string} usageLine - full single-line usage string (including `node tool/...`)
 * @returns {{ network: string, txHash: string }}
 */
function parseBridgeRegisterBtcCliArgs(argv, usageLine) {
    const validationResult = validateBridgeRegisterBtcCliArgs(argv);
    if (!validationResult.ok) {
        if (validationResult.reason === 'missing_args') {
            console.log(usageLine);
        } else if (validationResult.reason === 'bad_network') {
            console.error(
                `Invalid network "${validationResult.network}". Use mainnet, testnet, or regtest.`,
            );
            console.log(usageLine);
        } else if (validationResult.reason === 'bad_txid') {
            console.error('Invalid txid: expected 64 hexadecimal characters.');
        }
        process.exit(1);
    }
    return { network: validationResult.network, txHash: validationResult.txHash };
}

module.exports = { parseBridgeRegisterBtcCliArgs, validateBridgeRegisterBtcCliArgs };
