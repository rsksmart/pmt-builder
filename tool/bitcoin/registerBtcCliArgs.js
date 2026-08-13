const { isMempoolNetwork } = require('./networks');

const TXID_HEX_RE = /^[0-9a-fA-F]{64}$/;
const SEND_FLAG = '--send';
const KNOWN_FLAGS = [SEND_FLAG];

/**
 * Pure validation for Bridge register-* BTC CLI scripts (no I/O, no `process.exit`).
 *
 * Positional arguments are `<network> <txHash>`; flags may appear anywhere. An
 * unrecognised flag is rejected rather than ignored, so a typo like `--sned` fails
 * loudly instead of silently leaving the script in dry-run mode.
 *
 * @param {string[]} argv - typically `process.argv`
 * @returns {{ ok: true, network: string, txHash: string, send: boolean } | { ok: false, reason: 'missing_args'|'bad_network'|'bad_txid'|'unknown_flag', network?: string, flag?: string }}
 */
function validateBridgeRegisterBtcCliArgs(argv) {
    const args = argv.slice(2);
    const flags = args.filter((arg) => arg.startsWith('--'));
    const filteredArgs = args.filter((arg) => !arg.startsWith('--'));

    const unknownFlag = flags.find((flag) => !KNOWN_FLAGS.includes(flag));
    if (unknownFlag) {
        return { ok: false, reason: 'unknown_flag', flag: unknownFlag };
    }

    const network = filteredArgs[0];
    const txHash = filteredArgs[1];

    if (!network || !txHash) {
        return { ok: false, reason: 'missing_args' };
    }

    if (!isMempoolNetwork(network) && network !== 'regtest') {
        return { ok: false, reason: 'bad_network', network };
    }

    if (!TXID_HEX_RE.test(txHash)) {
        return { ok: false, reason: 'bad_txid' };
    }

    return { ok: true, network, txHash, send: flags.includes(SEND_FLAG) };
}

/**
 * Validates `argv` for Bridge register-* BTC CLI scripts (network + txid + flags).
 * On failure: prints usage / errors and calls `process.exit(1)`.
 *
 * @param {string[]} argv - typically `process.argv`
 * @param {string} usageLine - full single-line usage string (including `node tool/...`)
 * @returns {{ network: string, txHash: string, send: boolean }}
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
        } else if (validationResult.reason === 'unknown_flag') {
            console.error(
                `Unknown flag "${validationResult.flag}". Supported flags: ${KNOWN_FLAGS.join(', ')}.`,
            );
            console.log(usageLine);
        }
        process.exit(1);
    }
    return {
        network: validationResult.network,
        txHash: validationResult.txHash,
        send: validationResult.send,
    };
}

module.exports = { parseBridgeRegisterBtcCliArgs, validateBridgeRegisterBtcCliArgs, SEND_FLAG };
