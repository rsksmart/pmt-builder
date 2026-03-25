![Github CI/CD](https://github.com/rsksmart/pmt-builder/actions/workflows/build-test.yml/badge.svg)
[![CodeQL](https://github.com/rsksmart/pmt-builder/workflows/CodeQL/badge.svg)](https://github.com/rsksmart/pmt-builder/actions?query=workflow%3ACodeQL)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/rsksmart/pmt-builder/badge)](https://scorecard.dev/viewer/?uri=github.com/rsksmart/pmt-builder)

# pmt-builder

PartialMerkleTree builder library.

This library can be used to build a partial merkle tree for a block of transactions. A partial merkle tree is a pruned version of a full merkle tree, containing only the parts needed to prove a given transaction is part of the tree. 

## Installation

> npm install @rsksmart/pmt-builder

### Install dependencies

> npm install

## Usage

To build the tree, simply call the `buildPMT` function and pass the `leaves` as a list of strings and a `filteredHash` in string format, i.e buildPMT(leaves: string[], filteredHash: string)

First parameter {leaves}: An array of transaction hashes of all transactions without witness(txid) in a block.
Second parameter {filteredHash}: transaction hash (the hash without witness).

The function returns an object with the following fields:
totalTX: the size of {leaves} in the array.
Hashes: All the hashes that build the partial merkle tree. This includes the leaves level as well as the upper levels of the tree.
flags: The number of flags bytes to follow.
Hex: The partial merkle tree serialized in hex format.

### Sample Snippet

```
const pmtBuilder = require("@rsksmart/pmt-builder");

const blockTransactions = [
    '8f01832aa125683490e70a9142ccd9c49485b84708180487b5f35dc7795a3afd',
    '6cc629897f3f6c3e873e98af8061f54618fe2be6599853841ca97aeb9614a136',
    '31c8227345ead8477845fda6d8dc68cc1bca9c094523aef60d857d521aca6937',
    'e0714cbc5ed04014e1a1f362612fdb05578a1c8e45257ac6cc0dff0d2e532855',
    '0f9e8932b5bbcad80242077205843e42bcca9d84c58b751535ea07a06e4179e6',
    '5a4d2446ff81be95eacaaac0fcd06856f9625f6f07391a2bf90b1a065be0e0fc'
];

const resultPmt = pmtBuilder.buildPMT(blockTransactions, blockTransactions[0]);
console.log("Result: ", resultPmt);
```
### Tool Usage

This library can be used via a tool (this tool calls the [Mempool Space](https://mempool.space) public REST API with Node’s built-in `fetch` to load transactions) that exists in the `tool/pmt-builder.js` file via the following command: 

`node tool/pmt-builder.js network txHash`,

For example:

> node tool/pmt-builder.js testnet 5cec844c7d2443175c91d39d7be0acf9e4cfc468fbfe3f3dd05c747d60c59e12

```js
{
  totalTX: 12,
  hashes: [
    'e5efef55b2dfe1b875aa2ae4de1cea496979743c9384949ec7d369e427edab0e',
    '5cec844c7d2443175c91d39d7be0acf9e4cfc468fbfe3f3dd05c747d60c59e12',
    '96b2c87a2740ae693e7ab6ad6ccd9fd0cb70908782d7cd74f2c6f99e3058a396',
    '6c40b1f9852cd7b15b4c2c8e21f47496085843af4d2c11aced6535ceed7d4b79',
    '52822874d9a5304fb971b62223e4981936dcc60b46a9f851140b7313ed571e52'
  ],
  flags: 12032,
  hex: '0c000000050eabed27e469d3c79e9484933c74796949ea1cdee42aaa75b8e1dfb255efefe5129ec5607d745cd03d3ffefb68c4cfe4f9ace07b9dd3915c1743247d4c84ec5c96a358309ef9c6f274cdd782879070cbd09fcd6cadb67a3e69ae40277ac8b296794b7dedce3565edac112c4daf4358089674f4218e2c4c5bb1d72c85f9b1406c521e57ed13730b1451f8a9460bc6dc361998e42322b671b94f30a5d974288252022f00'
}
```

`network`: testnet or mainnet
`txHash`: filtered transaction hash in hex format

### Getting a pegin btc transaction information ready to register

The Bridge `registerBtcTransaction` method receives 3 parameters: `tx`, the raw btc transaction. `height`, the block height for this transaction. `pmt`, the Partial Merkle Tree of this transaction.

To ease the process of registering a pegin btc transaction, the function `getInformationReadyForRegisterBtcTransaction` gets these values for you, given a bitcoin network name (`mainnet`, `testnet`, or `regtest`) and a btc transaction hash, ready to be sent to the Bridge `registerBtcTransaction` method without further setup.

For **mainnet** and **testnet**, transaction and block data are fetched from the [Mempool Space](https://mempool.space) public REST API (no extra configuration).

For **regtest**, data is read from a local [Bitcoin Core](https://bitcoincore.org/) node over JSON-RPC. The tool uses `BITCOIND_RPC_URL` (and optional `BITCOIND_RPC_USER` / `BITCOIND_RPC_PASSWORD`) so you can point at your node’s host, port, and credentials—whether that is regtest on a non-default port or another setup that still speaks Bitcoin Core JSON-RPC.

If you will use regtest or a non-default RPC endpoint, set `BITCOIND_RPC_URL` and, if needed, `BITCOIND_RPC_USER` and `BITCOIND_RPC_PASSWORD`. See `.env.example` for descriptions.

**Option A — `.env` file:** Copy `.env.example` to `.env` in the project root, edit the values, then run the `node` command below. The script loads `.env` with [dotenv](https://github.com/motdotla/dotenv) (no need to `source` or export manually). `.env` is gitignored so credentials stay local.

**Option B — inline (one-off):** Set variables on the same line as `node`, for example:

`BITCOIND_RPC_URL=http://127.0.0.1:18443 BITCOIND_RPC_USER=test BITCOIND_RPC_PASSWORD=test node tool/getInformationReadyForRegisterBtcTransaction.js regtest <btcTransactionHash>`

Inline variables override anything set in `.env` for that process.

The confirming transaction must be visible to `getrawtransaction` (typically enable `txindex=1` in `bitcoin.conf` for arbitrary confirmed txs).

This is how to use it:

`node tool/getInformationReadyForRegisterBtcTransaction.js <network> <btcTransactionHash>`

For example (testnet):

> node tool/getInformationReadyForRegisterBtcTransaction.js testnet 5cec844c7d2443175c91d39d7be0acf9e4cfc468fbfe3f3dd05c747d60c59e12

It will return the following:

```js
{
  tx: '0x02000000017ad5e3f7f2c46350b912e0c7772ccec107c5a664bc6ee47bbef76fc016e05f1b01000000fd16030047304402204b5cc3567412ce754481ce35442381f43dc60c319c5446afe26de58465983f29022046dd603f1abc2905d91071cee34e3c5463373f7f0cb37780e00acb25f66f076e01483045022100ecdec4d16e80f3cfda108d990cec148fd77f5bd4a78154320b82e799dc255513022054231cf4ba857721f7a4ef608c7959ae269129f5e3c2ef2c439b710bc56ac8480147304402201c52f5a0f0803e500e0d847d7fca54b67d7612361919df47d183dff3a87d8582022044a419a1d451271b9c05c71adead35b7cbdebb26a3fff65fff2a7c94be425a7901473044022059a85e9d54d23f49cfd492a349346edf6aeca4999f9add38816d531107beda7f0220555dab8ab0a327435fc97f264ec031dd0fdc8432e6b251fc79d968e62376b67c01483045022100ff13dc6ee89c796953c7a4e6fb34e7c588b9ced87435ceff2a706aba04c27ebc022067cd2b96606b63e7ec1baa5becdc7204f500c2566f57380361ea61c7318ef9df01004da70164552102099fd69cf6a350679a05593c3ff814bfaa281eb6dde505c953cf2875979b1209210222caa9b1436ebf8cdf0c97233a8ca6713ed37b5105bcbbc674fd91353f43d9f721022a159227df514c7b7808ee182ae07d71770b67eda1e5ee668272761eefb2c24c2102afc230c2d355b1a577682b07bc2646041b5d0177af0f98395a46018da699b6da2102b1645d3f0cff938e3b3382b93d2d5c082880b86cbb70b6600f5276f235c2839221039ee63f1e22ed0eb772fe0a03f6c34820ce8542f10e148bc3315078996cb81b252103d25ed2fcf9e05537f6e1daa7affcafdb3effc9f68cb2aecdcad66c901ae1b6572103e2fbfd55959660c94169320ed0a778507f8e4c7a248a71c6599a4ce8a3d956ac2103eae17ad1d0094a5bf33c037e722eaf3056d96851450fb7f514a9ed3af1dbb57059ae670350cd00b27552210216c23b2ea8e4f11c3f9e22711addb1d16a93964796913830856b568cc3ea21d3210275562901dd8faae20de0a4166362a4f82188db77dbed4ca887422ea1ec185f1421034db69f2112f4fb1bb6141bf6e2bd6631f0484d0bd95b16767902c9fe219d4a6f53ae68ffffffff02a1080600000000001976a91431b0e16eacea89818ad6532504a77e4e5b18193c88aca08601000000000017a91423b8cdb52fd91d35d6ec5821ef91c9d6da67b78a8700000000',
  height: 4706672,
  pmt: '0x0c000000050eabed27e469d3c79e9484933c74796949ea1cdee42aaa75b8e1dfb255efefe5129ec5607d745cd03d3ffefb68c4cfe4f9ace07b9dd3915c1743247d4c84ec5c96a358309ef9c6f274cdd782879070cbd09fcd6cadb67a3e69ae40277ac8b296794b7dedce3565edac112c4daf4358089674f4218e2c4c5bb1d72c85f9b1406c521e57ed13730b1451f8a9460bc6dc361998e42322b671b94f30a5d974288252022f00'
}
```

Then you can copy the `tx`, `height` and `pmt` as parameters to the Bridge `registerBtcTransaction` method.

You can use the Rootstock explorer to register the transaction.

For testnet: https://explorer.testnet.rootstock.io/address/0x0000000000000000000000000000000001000006?tab=contract

For mainnet: https://explorer.rootstock.io/address/0x0000000000000000000000000000000001000006?tab=contract

Simply go to `Write Contract`, then click on `Connect Wallet`, Click on `registerBtcTransaction` to expand it, paste the data in their corresponding fields, and click on `Write`.

Notice that the hex value of these fields (`tx` and `pmt`) have the `0x` prefix, that's because the `registerBtcTransaction` requires them to be like that.

To check if it has been successfully registered, go to `Read Contract`, then click on `isBtcTxHashAlreadyProcessed` to expand it, paste the btc transaction hash and click on `Read`. If it returns `true`, then it has been registered. You can also use `getBtcTxHashProcessedHeight` to get the block number where it was processed.

### Getting a coinbase transaction information ready to register

The Bridge `registerBtcCoinbaseTransaction` method receives 5 parameters: `btcTxSerialized:`, the coinbase raw btc transaction. `btcBlockHash:`, the block hash for this transaction. `pmtSerialized:`, the Partial Merkle Tree of this transaction. `witnessMerkleRoot:`, the witness merkle root of the coinbase transaction. `witnessReservedValue:`, the witness reserved value of the coinbase transaction.

To ease the process of registering a coinbase transaction, the function `getInformationReadyForRegisterCoinbaseTransaction` gets these values for you, given a bitcoin network name (testnet, mainnet) and a btc transaction hash, ready to be sent to the Bridge `registerBtcCoinbaseTransaction` method without further setup.

This is how to use it:

> node tool/getInformationReadyForRegisterCoinbaseBtcTransaction.js <network> <btcCoinbaseTransactionHash>

For example:

> node tool/getInformationReadyForRegisterCoinbaseBtcTransaction.js mainnet a3e666b1c03153d6eb857f3bca256a9c4515650b2d364507c5c422b56e01da1e

It will return the following:

```json
 {
    "btcTxSerialized": "0x01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff640327c50d2cfabe6d6dfb8bde50cdf9fc51da06e181de4eab07007fd48403bad4deee68ac4aa090bbfa10000000f09f909f092f4632506f6f6c2f6400000000000000000000000000000000000000000000000000000000000000000000000500b3c924a0010000000822020000000000001976a914c6740a12d0a7d556f89782bf5faf0e12cf25a63988ac99bc5d13000000001976a91469f2a01f4ff9e6ac24df9062e9828753474b348088ac0000000000000000266a24aa21a9ed38ee89c6e8d8d8fbe507f87f129e0c7ef3ea1f62c39c1dedefe9e1a0815f1cd700000000000000002f6a2d434f524501f6fdbc19a25dc91454cec19ef7714e8b67c4e0e6e7ec323813c943336c579e238228a8ebd096a7e50000000000000000126a10455853415401051b0f0e0e0b1f1200130000000000000000266a2448617468247c5f3da9cb0cc15f3e44e4e8bb3bf5e80003c3e482217093598bfee687c51500000000000000002c6a4c2952534b424c4f434b3a2c9285dd0432125f9b6542a08cd10401d194fbfe3d389151b6758012007584960000000000000000296a2773797355f6a1932b73505d1066f79ebf9b8b8954e4cb327ba1cb90c54c817c94d8936e6c561f007655ef3f",
    "btcBlockHash": "0x00000000000000000000cdc4fd3ff7bcdd9797aaf644431e0b575049d9b0d9f1",
    "pmtSerialized": "0x760a00000dcbbd92367c8b4bf2ea8031d7f2eae51868f39b5788112e10e04bbaa2bc33ab01ce649074624ea8f4c942537dc878791b76bc839b1ac9de24cb159444373105cd88ad1761216e10d6779f60728f84e7b93156e09ef9514888d86e46c9f223093982d25540c89229bcb414540a8a47b789202fbd1f37e383c4a0a8d8c83deca5a78e5a13451d1a2b68b13cf37ccd74b9e87e0af90ff7488226f4f4bfe50a9b8420312d7ae96c9e4e7c6070ecbe46567d7f7cfe55e5e9adf11cc973d1c9f495abbe56848dac5ecb360245c2c39a25b27d3d74760c300b383a5da90f99369b6e56ac126c044daf7f96083e5c003062322a6b802e1242a29a86eed2095ff8ed6dad2ceb7fea06b96f03a0666a51d581cf69d2f06c500b60c090f4ee43d7a12b5cc5aba7d469a1f64e9a0a13c0213517e0477578283d0aa4a86bc84f02e3b527813ae217bbd2565d0b2c0510d103306db9b42e00ca31ab6acc0164d0114add57b9237be0ab2cfaf66cb001c5ceb5acce2f19dbdf7798240c1461c14952903f73aa3d80be1e6b336893895b34f7e610aeca58eab520de872035e1d5059332c57ad720e904ff1f0000",
    "witnessMerkleRoot": "0xf4aa088295b55991a396a3caaa9da6fde85a0d34e009e73bbe2a508f2ffce763",
    "witnessReservedValue": "0x0000000000000000000000000000000000000000000000000000000000000000"
}
```

Then you can copy the `btcTxSerialized`, `btcBlockHash`, `pmtSerialized`, `witnessMerkleRoot` and `witnessReservedValue` as parameters to the Bridge `registerBtcCoinbaseTransaction` method.

You can use the Rootstock explorer to register the coinbase transaction following the same steps above.

## Test

To run test:

> npm test

For any comments or suggestions, feel free to contribute or reach out at our [Discord server](https://discord.gg/rootstock).
