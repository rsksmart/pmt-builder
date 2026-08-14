/**
 * Shared plumbing for the RSK Bridge register* CLI scripts: provider and wallet
 * setup, gas pricing for RSK's legacy (type 0) transactions, calldata encoding,
 * signing, and dry-run/broadcast.
 *
 * What stays in each script is what actually differs: which Bridge method to call
 * and which arguments to pass it.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const { ethers } = require('ethers');
const { bridge } = require('@rsksmart/rsk-precompiled-abis');

const GAS_PRICE_FLOOR = 1000000n;
const GAS_PRICE_HEADROOM_PERCENT = 110n;
const GAS_LIMIT_HEADROOM_PERCENT = 120n;
const GAS_LIMIT_FALLBACK = 5000000n;

/**
 * Builds a provider from RPC_URL. Call this before any slow work so a missing
 * endpoint fails immediately rather than after the bitcoin data has been fetched.
 *
 * @returns {ethers.JsonRpcProvider}
 */
const getProvider = () => {
    const rpcUrl = process.env.RPC_URL;
    if (!rpcUrl) {
        throw new Error('Set RPC_URL in .env (your JSON-RPC endpoint).');
    }
    return new ethers.JsonRpcProvider(rpcUrl);
};

/**
 * Resolves the sending wallet from PRIVATE_KEY, or derives one from SENDER_SEED.
 *
 * @param {ethers.JsonRpcProvider} provider
 * @returns {ethers.Wallet}
 */
const getWallet = (provider) => {
    let privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        const seed = process.env.SENDER_SEED;
        if (!seed) {
            throw new Error('Set SENDER_SEED for the wallet that will send the tx in .env');
        }

        privateKey = ethers.keccak256(ethers.toUtf8Bytes(seed));
    }

    return new ethers.Wallet(privateKey, provider);
};

/**
 * RSK uses legacy (type 0) transactions with a single gasPrice. Respect the network
 * minimum gas price from the latest block, with a small bump.
 *
 * @param {ethers.JsonRpcProvider} provider
 * @returns {Promise<bigint>}
 */
const getLegacyGasPrice = async (provider) => {
    const [latestBlock, nodeGasPriceHex] = await Promise.all([
        provider.send('eth_getBlockByNumber', ['latest', false]),
        provider.send('eth_gasPrice', []),
    ]);

    const minGasPrice = latestBlock.minimumGasPrice ? BigInt(latestBlock.minimumGasPrice) : 0n;
    const nodeGasPrice = BigInt(nodeGasPriceHex);

    let gasPrice = nodeGasPrice > minGasPrice ? nodeGasPrice : minGasPrice;
    if (gasPrice === 0n) gasPrice = GAS_PRICE_FLOOR;

    return (gasPrice * GAS_PRICE_HEADROOM_PERCENT) / 100n;
};

/**
 * Estimates gas for a Bridge call.
 *
 * When estimation fails, the call is replayed with eth_call to find out why. If that
 * fails too, the Bridge has told us the call cannot succeed and we refuse to sign it
 * rather than burning gas on a doomed transaction. If eth_call succeeds, only the
 * estimator was unhappy, so a generous fallback limit is used.
 *
 * The two cases cannot be told apart from the error alone: ethers reports every
 * estimateGas failure as CALL_EXCEPTION, whether or not any revert data came back.
 *
 * @param {ethers.JsonRpcProvider} provider
 * @param {{ from: string, data: string }} call
 * @returns {Promise<bigint>}
 * @throws when the call does not execute against the current state
 */
const estimateGasLimit = async (provider, { from, data }) => {
    try {
        const estimated = await provider.estimateGas({ from, to: bridge.address, data });
        return (estimated * GAS_LIMIT_HEADROOM_PERCENT) / 100n;
    } catch (estimateError) {
        try {
            await provider.call({ from, to: bridge.address, data });
        } catch (callError) {
            const message = callError.shortMessage ?? callError.message;
            throw new Error(
                `The Bridge rejected this call, so it was not signed or broadcast: ${message}\n`
                + 'Common causes: the block coinbase is not registered yet (required for SegWit '
                + "transactions); the btc block is not in the Bridge's headers chain yet, or lacks "
                + 'confirmations.',
                { cause: callError },
            );
        }

        const message = estimateError.shortMessage ?? estimateError.message;
        console.warn(
            `estimateGas failed but the call itself succeeds; using fallback ${GAS_LIMIT_FALLBACK}:`,
            message,
        );
        return GAS_LIMIT_FALLBACK;
    }
};

/**
 * ABI-encodes a Bridge method call. The ABI comes from @rsksmart/rsk-precompiled-abis,
 * so the signatures stay in step with the deployed Bridge.
 *
 * @param {string} method
 * @param {unknown[]} args
 * @returns {string} 0x-prefixed calldata
 */
const encodeBridgeCall = (method, args) => {
    const bridgeInterface = new ethers.Interface(bridge.abi);
    return bridgeInterface.encodeFunctionData(method, args);
};

/**
 * Reads a view method on the Bridge.
 *
 * @param {ethers.JsonRpcProvider} provider
 * @param {string} method
 * @param {unknown[]} args
 * @returns {Promise<any>} the first return value
 */
const readBridge = async (provider, method, args) => {
    const bridgeInterface = new ethers.Interface(bridge.abi);
    const data = bridgeInterface.encodeFunctionData(method, args);
    const result = await provider.call({ to: bridge.address, data });
    return bridgeInterface.decodeFunctionResult(method, result)[0];
};

/**
 * Whether the Bridge has already registered this btc transaction.
 *
 * @param {ethers.JsonRpcProvider} provider
 * @param {string} btcTxHash - btc txid, with or without 0x
 * @returns {Promise<boolean>}
 */
const isBtcTxAlreadyProcessed = async (provider, btcTxHash) =>
    readBridge(provider, 'isBtcTxHashAlreadyProcessed', [String(btcTxHash).replace(/^0x/, '')]);

/**
 * The rsk block height at which the Bridge registered the transaction.
 *
 * @param {ethers.JsonRpcProvider} provider
 * @param {string} btcTxHash - btc txid, with or without 0x
 * @returns {Promise<bigint>} the Bridge returns int64
 */
const getBtcTxHashProcessedHeight = async (provider, btcTxHash) =>
    readBridge(provider, 'getBtcTxHashProcessedHeight', [String(btcTxHash).replace(/^0x/, '')]);

/**
 * Whether the Bridge already holds the coinbase (witness commitment) information for
 * a btc block. Registering it twice is a no-op that still costs gas.
 *
 * @param {ethers.JsonRpcProvider} provider
 * @param {string} btcBlockHash - block hash, with or without 0x
 * @returns {Promise<boolean>}
 */
const hasCoinbaseInformation = async (provider, btcBlockHash) =>
    readBridge(provider, 'hasBtcBlockCoinbaseTransactionInformation', [
        `0x${String(btcBlockHash).replace(/^0x/, '')}`,
    ]);

/**
 * Encodes, signs and optionally broadcasts a Bridge call.
 *
 * @param {Object} params
 * @param {string} params.method - Bridge method name, e.g. 'registerBtcTransaction'
 * @param {unknown[]} params.args - arguments in the method's declared order
 * @param {boolean} [params.send=false] - broadcast and wait for the receipt; otherwise dry run
 * @param {ethers.JsonRpcProvider} [params.provider] - defaults to getProvider()
 * @param {ethers.Wallet} [params.wallet] - defaults to getWallet(provider)
 * @returns {Promise<ethers.TransactionReceipt|undefined>} the receipt when broadcast, undefined on a dry run
 */
const sendBridgeCall = async ({ method, args, send = false, provider, wallet }) => {
    const rskProvider = provider ?? getProvider();
    const sender = wallet ?? getWallet(rskProvider);
    console.log('Sender address :', sender.address);

    // Encode calldata for the Bridge method.
    const data = encodeBridgeCall(method, args);

    // None of these depend on each other, so pay for one round trip instead of four.
    const [network, nonce, gasPrice, gasLimit] = await Promise.all([
        rskProvider.getNetwork(),
        rskProvider.getTransactionCount(sender.address, 'pending'),
        getLegacyGasPrice(rskProvider),
        estimateGasLimit(rskProvider, { from: sender.address, data }),
    ]);
    const { chainId } = network;

    const txRequest = {
        type: 0,
        to: bridge.address,
        data,
        value: 0n,
        nonce,
        gasLimit,
        gasPrice,
        chainId,
    };

    const rawSigned = await sender.signTransaction(txRequest);

    console.log('\n--- transaction ---');
    console.log('method   :', `${method} (${data.slice(0, 10)})`);
    console.log('chainId  :', chainId.toString());
    console.log('nonce    :', nonce);
    console.log('gasPrice :', gasPrice.toString());
    console.log('gasLimit :', gasLimit.toString());
    console.log('\nraw signed tx (for eth_sendRawTransaction):');
    console.log(rawSigned);

    if (!send) {
        console.log('\nDry run only. Re-run with --send to broadcast, or curl it:');
        console.log(`curl -s -X POST "$RPC_URL" -H 'content-type: application/json' \\`);
        console.log(`  --data '{"jsonrpc":"2.0","id":1,"method":"eth_sendRawTransaction","params":["${rawSigned}"]}'`);
        return undefined;
    }

    const broadcastTxHash = await rskProvider.send('eth_sendRawTransaction', [rawSigned]);
    console.log('\nBroadcast. tx hash:', broadcastTxHash);

    const receipt = await rskProvider.waitForTransaction(broadcastTxHash);
    console.log('status   :', receipt.status === 1 ? 'success' : 'FAILED');
    console.log('block    :', receipt.blockNumber);

    return receipt;
};

module.exports = {
    getProvider,
    getWallet,
    getLegacyGasPrice,
    estimateGasLimit,
    encodeBridgeCall,
    readBridge,
    isBtcTxAlreadyProcessed,
    getBtcTxHashProcessedHeight,
    hasCoinbaseInformation,
    sendBridgeCall,
};
