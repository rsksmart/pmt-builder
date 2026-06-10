/**
 * Sign and broadcast a registerBtcCoinbaseTransaction call to the RSK Bridge
 * using eth_sendRawTransaction (the key is held locally, NOT by the node).
 *
 * Get the 5 values first:
 *   node tool/getInformationReadyForRegisterBtcCoinbaseTransaction.js testnet <btcTxidInBlock> \
 *     and save the {btcTxSerialized, btcBlockHash, pmtSerialized, witnessMerkleRoot, witnessReservedValue}
 *     object into a JSON file, e.g. coinbase-values.json
 *
 * Usage:
 *   node tool/registerBtcCoinbaseTransaction.js --btcTxHash            # dry run: prints the raw signed tx
 *   node tool/registerBtcCoinbaseTransaction.js --btcTxHash --send     # also broadcasts via eth_sendRawTransaction
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const { ethers } = require('ethers');

const BRIDGE_ADDRESS = '0x0000000000000000000000000000000001000006';
const BRIDGE_ABI = [
    'function registerBtcCoinbaseTransaction(bytes btcTxSerialized, bytes32 blockHash, bytes pmtSerialized, bytes32 witnessMerkleRoot, bytes32 witnessReservedValue)',
];

const main = async () => {
    const rpcUrl = process.env.RPC_URL;
    if (!rpcUrl) {
        throw new Error('Set RPC_URL in .env (your JSON-RPC endpoint).');
    }
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    const network = await provider.getNetwork();
    const btcTxHash = process.argv[2];;
    const { 
        btcTxSerialized, 
        blockHash, 
        pmtSerialized,
        witnessMerkleRoot, 
        witnessReservedValue 
    } = await getInformationReadyForRegisterBtcCoinbaseTransaction(network, btcTxHash);
    
    let privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        const seed = process.env.SENDER_SEED;
        if (!seed) {
            throw new Error('Set SENDER_SEED for the wallet that will send the tx in .env');
        }
        
        privateKey = ethers.keccak256(ethers.toUtf8Bytes(seed));
    }
    
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log('Sender address :', wallet.address);

    // Encode calldata for the Bridge method.
    const iface = new ethers.Interface(BRIDGE_ABI);
    const data = iface.encodeFunctionData('registerBtcCoinbaseTransaction', [
        btcTxSerialized, blockHash, pmtSerialized, witnessMerkleRoot, witnessReservedValue,
    ]);

    const chainId = network.chainId;
    const nonce = await provider.getTransactionCount(wallet.address, 'pending');

    // RSK uses legacy (type 0) transactions with a single gasPrice.
    // Respect the network minimum gas price from the latest block, with a small bump.
    const latestBlock = await provider.send('eth_getBlockByNumber', ['latest', false]);
    const minGasPrice = latestBlock.minimumGasPrice ? BigInt(latestBlock.minimumGasPrice) : 0n;
    const nodeGasPrice = BigInt(await provider.send('eth_gasPrice', []));
    let gasPrice = nodeGasPrice > minGasPrice ? nodeGasPrice : minGasPrice;
    if (gasPrice === 0n) gasPrice = 1000000n; // fallback floor
    gasPrice = (gasPrice * 110n) / 100n;      // +10% headroom

    // Estimate gas, fall back to a generous limit for the bridge precompile.
    let gasLimit;
    try {
        const est = await provider.estimateGas({
            from: wallet.address, to: BRIDGE_ADDRESS, data,
        });
        gasLimit = (est * 120n) / 100n;       // +20% headroom
    } catch (e) {
        console.warn('estimateGas failed, using fallback 5,000,000:', e.shortMessage ?? e.message);
        gasLimit = 5000000n;
    }

    const txRequest = {
        type: 0,
        to: BRIDGE_ADDRESS,
        data,
        value: 0n,
        nonce,
        gasLimit,
        gasPrice,
        chainId,
    };

    const rawSigned = await wallet.signTransaction(txRequest);

    console.log('\n--- transaction ---');
    console.log('chainId  :', chainId.toString());
    console.log('nonce    :', nonce);
    console.log('gasPrice :', gasPrice.toString());
    console.log('gasLimit :', gasLimit.toString());
    console.log('\nraw signed tx (for eth_sendRawTransaction):');
    console.log(rawSigned);

    const doSend = process.argv.includes('--send');
    if (!doSend) {
        console.log('\nDry run only. Re-run with --send to broadcast, or curl it:');
        console.log(`curl -s -X POST "$RPC_URL" -H 'content-type: application/json' \\`);
        console.log(`  --data '{"jsonrpc":"2.0","id":1,"method":"eth_sendRawTransaction","params":["${rawSigned}"]}'`);
        return;
    }

    const broadcastTxHash = await provider.send('eth_sendRawTransaction', [rawSigned]);
    console.log('\nBroadcast. tx hash:', broadcastTxHash);

    const receipt = await provider.waitForTransaction(broadcastTxHash);
    console.log('status   :', receipt.status === 1 ? 'success' : 'FAILED');
    console.log('block    :', receipt.blockNumber);
};

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
