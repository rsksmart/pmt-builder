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

> node tool/pmt-builder.js testnet fba7b0c2af3af7dfb90bf2dee036ec2e5060dbe9d32781cb65ea29f7b90d42de

```js
{
  totalTX: 2,
  hashes: [
    '5f82c03160d2142b2b5e6d2692d228edd673398ab04f0606e3aa744870813828',
    'fba7b0c2af3af7dfb90bf2dee036ec2e5060dbe9d32781cb65ea29f7b90d42de'
  ],
  flags: 5,
  hex: '0200000002283881704874aae306064fb08a3973d6ed28d292266d5e2b2b14d26031c0825fde420db9f729ea65cb8127d3e9db60502eec36e0def20bb9dff73aafc2b0a7fb0105'
}
```

`network`: testnet or mainnet  
`txHash`: filtered transaction hash in hex format

### Regtest setup

Both Bridge helpers below support **`regtest`** by calling a local [Bitcoin Core](https://bitcoincore.org/) node over **JSON-RPC**. Configure this once, then run the `node` commands without exporting variables manually.

1. **Create or edit `.env` in the project root.** Copy `.env.example` to `.env` if needed. Set:
   - **`BITCOIND_RPC_URL`** — HTTP JSON-RPC base URL, e.g. `http://127.0.0.1:18443` (Bitcoin Core’s default regtest RPC port is **18443**; **18444** is the default regtest P2P port). Use whatever host/port your `rpcport` / `rpcbind` uses.
   - **`BITCOIND_RPC_USER`** and **`BITCOIND_RPC_PASSWORD`** — must match `rpcuser` / `rpcpassword` in `bitcoin.conf` when RPC authentication is enabled. Leave both empty only if the node allows unauthenticated localhost RPC.
2. **Bitcoin Core:** run in **regtest** and enable **`txindex=1`** in `bitcoin.conf` if you need `getrawtransaction` for arbitrary confirmed txids (not only wallet-related txs).
3. **Run from the repo root** (after `npm install`). The scripts load `.env` with [dotenv](https://github.com/motdotla/dotenv); `.env` is gitignored.

Optional: override `.env` for a single shell command by prefixing, e.g. `BITCOIND_RPC_URL=http://127.0.0.1:18332 node tool/...`.

With `.env` in place, examples:

`node tool/getInformationReadyForRegisterBtcTransaction.js regtest <btcTransactionHash>`

`node tool/getInformationReadyForRegisterBtcCoinbaseTransaction.js regtest <btcTransactionHashInBlock>`

### Getting a pegin btc transaction information ready to register

The Bridge `registerBtcTransaction` method receives 3 parameters: `tx`, the raw btc transaction. `height`, the block height for this transaction. `pmt`, the Partial Merkle Tree of this transaction.

To ease the process of registering a pegin btc transaction, the function `getInformationReadyForRegisterBtcTransaction` gets these values for you, given a bitcoin network name (`mainnet`, `testnet`, or `regtest`) and a btc transaction hash, ready to be sent to the Bridge `registerBtcTransaction` method without further setup.

For **mainnet** and **testnet**, transaction and block data are fetched from the [Mempool Space](https://mempool.space) public REST API (no extra configuration). Those requests use retry with exponential backoff on HTTP 429; if retries are exhausted, the tool **throws** (it does not return partial/null payloads).

For **regtest**, see [Regtest setup](#regtest-setup) above.

This is how to use it:

`node tool/getInformationReadyForRegisterBtcTransaction.js <network> <btcTransactionHash>`

**CLI argument order:** `<network>` first (`mainnet`, `testnet`, or `regtest`), then the Bitcoin **txid** (hex). If you have older scripts that passed the txid before the network name, update them to match this order.

Example (testnet):

> node tool/getInformationReadyForRegisterBtcTransaction.js testnet fba7b0c2af3af7dfb90bf2dee036ec2e5060dbe9d32781cb65ea29f7b90d42de

It will return the following:

```js
{
  tx: '0x02000000000102d7dc94d772d5234b4a7c601f64a98558e041dccd6261e59ed73ff7b6d366171a0100000023220020fe796857abb72b2a8d4f1429f73d6f8efc5bbd023b2bad498e51b9b334faa45dffffffff78cf87972c18206a3782cd6902410880221926191d713cd5d0e00248cf852a580200000023220020fe796857abb72b2a8d4f1429f73d6f8efc5bbd023b2bad498e51b9b334faa45dffffffff02a0809800000000001976a914cab5925c59a9a413f8d443000abcc5640bdf067588ac20a107000000000017a914a3562b6a12b34eb98a8164ea5c5f7e40fd6ddac8870900483045022100e058502d0efe8ac622872440426cc73866de90c45aaf2a608f5b7311ccbba6c802200d56409614dd45f6d27513c5c170f1d81dba5e28ae7dcd4f1aa479df74254bd301473044022048b1baeaf207c7f809ba540246a264417fa5ec0e812d4d1cd0a4479ef6f7fa180220678311cea80201fcb647cbe53c97596854f598ae2f191c4f9a9636abc95ab08c0148304502210096ac6aa22f493284deb1584a70cb1771e678fce8b22fd0d46fe9c589e2109bfa02203c13eaf12b76299f01972484229b4fd1495a38c2a9609fb7766be3265d9e2bbe0148304502210090fc7e7d8b44c23881269a84e83261fda1ac69b829cd473933a01690c4db21a602206ec74a60cefda742422955c9c34d067d77090f3b4568db6df12afc798adc6d1101483045022100b8a233ef206b6319b0d7c8c093dd41c2391c7b909ae1ac5f621f52fae6557fff02206976008021b7f6e3b4dc6a3003414d426e573a7a5222b528f59874b5761142f6014830450221008e8f0af19790482517d8f4fc05d9d7ce9215048b7ab30b7f3200adde2ac4d9090220576b40321f76d6102a508835b59c40cc3e96e5ab363b882add864b118eed11ac0100fdeb0164562102099fd69cf6a350679a05593c3ff814bfaa281eb6dde505c953cf2875979b1209210222caa9b1436ebf8cdf0c97233a8ca6713ed37b5105bcbbc674fd91353f43d9f7210227e1a5773a58e9be74cd1eaa670150f3ca39bead7cf0fbb6d6d53faca6e6b45c21022a159227df514c7b7808ee182ae07d71770b67eda1e5ee668272761eefb2c24c21027f49a747dfd39e4b0d71d01fcccb625a2dbe8a63d44407f1cb11d132d22bf4ac210292039a22480290feccf059d7be7cb541cba6af97897526befbf3e411dfa9ef8d2102afc230c2d355b1a577682b07bc2646041b5d0177af0f98395a46018da699b6da2102b1645d3f0cff938e3b3382b93d2d5c082880b86cbb70b6600f5276f235c2839221036a65b700e8dbb4a8c01a022b19b41e8c3501d2e3d3dbaa1953d2e1412e4111c62103857b9b09e19ffe17e39dd0274266f005ebfb99778a467469ea0f37e5d4bb0c482103cac7e78da7ca46910b3326438a9e784e8b1af5a3253fe7bd6cfac914449390155bae670350cd00b27552210216c23b2ea8e4f11c3f9e22711addb1d16a93964796913830856b568cc3ea21d3210275562901dd8faae20de0a4166362a4f82188db77dbed4ca887422ea1ec185f1421034db69f2112f4fb1bb6141bf6e2bd6631f0484d0bd95b16767902c9fe219d4a6f53ae680900483045022100a4aa5ebc6aec1574a786e3e79afa5878063e3149506b8c728a74b999be97322302203966a68c181f6bee7f63318fc58dfaf307791d077ac2d255d3175c8c507ee30501483045022100d26022d9b8a73aea6b739347f964e02e9c1b3102199ec4a8ac7cacdc8a5e05750220547551c7393f67c5b1cf6c9552bd479ac30b7156f0500c745b9da375e7c5708601483045022100fa6dc7a1be514f77a3725bc8bb3f4ad6f00f3bbbb2fc618c0b974c9658ed10970220525bfbbe7cef7fba531ca39faf1715a0a86c68a9a044650bd659a6300d3a351b014730440220427cb2aa550892086b3e86c4a7c2f40f106239e3c6c439a4d72f39bf8a67962d02204b4c0f66e4e63337b07d1eaf286919eaa0b1d14ff7ca22f34052373710bde2d601483045022100dea0ece73fc413c659d2bb2cf12aab171ccab3e66bdb46d4d6076e18d3599ce402203e991f656bb1481ce5e8c71aa881f7f6d989e73683aac3d6d40d7d6676dd4bcc0147304402207efd86fadf5c35b22e2b87fc76ecbe53e1eb3003742b06694fb5c4d3556c93e902207900f14f11217cb484dd1eda4671d064709be0e625dc9719897d7df4a58750030100fdeb0164562102099fd69cf6a350679a05593c3ff814bfaa281eb6dde505c953cf2875979b1209210222caa9b1436ebf8cdf0c97233a8ca6713ed37b5105bcbbc674fd91353f43d9f7210227e1a5773a58e9be74cd1eaa670150f3ca39bead7cf0fbb6d6d53faca6e6b45c21022a159227df514c7b7808ee182ae07d71770b67eda1e5ee668272761eefb2c24c21027f49a747dfd39e4b0d71d01fcccb625a2dbe8a63d44407f1cb11d132d22bf4ac210292039a22480290feccf059d7be7cb541cba6af97897526befbf3e411dfa9ef8d2102afc230c2d355b1a577682b07bc2646041b5d0177af0f98395a46018da699b6da2102b1645d3f0cff938e3b3382b93d2d5c082880b86cbb70b6600f5276f235c2839221036a65b700e8dbb4a8c01a022b19b41e8c3501d2e3d3dbaa1953d2e1412e4111c62103857b9b09e19ffe17e39dd0274266f005ebfb99778a467469ea0f37e5d4bb0c482103cac7e78da7ca46910b3326438a9e784e8b1af5a3253fe7bd6cfac914449390155bae670350cd00b27552210216c23b2ea8e4f11c3f9e22711addb1d16a93964796913830856b568cc3ea21d3210275562901dd8faae20de0a4166362a4f82188db77dbed4ca887422ea1ec185f1421034db69f2112f4fb1bb6141bf6e2bd6631f0484d0bd95b16767902c9fe219d4a6f53ae6800000000',
  height: 4954199,
  pmt: '0x0200000002000000000000000000000000000000000000000000000000000000000000000026b9c5fa1aa3b9d2b4189cd5356135c1acff078662c50da07f28e48a002af1f70105'
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

To ease the process of registering a coinbase transaction, run `getInformationReadyForRegisterBtcCoinbaseTransaction.js` (same order as the Bridge method name `registerBtcCoinbaseTransaction`: **Btc** then **Coinbase**). It takes a bitcoin network name (`mainnet`, `testnet`, or `regtest`) and a **btc transaction hash of any transaction in the block** whose coinbase you want (the tool resolves the block, then uses that block’s coinbase), and prints values ready for the Bridge `registerBtcCoinbaseTransaction` method without further setup.

For **mainnet** and **testnet**, data is fetched from the [Mempool Space](https://mempool.space) public REST API, with the same 429 retry behavior as the `registerBtcTransaction` helper (eventually **throws** if rate limits persist).

For **regtest**, see [Regtest setup](#regtest-setup) above.

This is how to use it:

`node tool/getInformationReadyForRegisterBtcCoinbaseTransaction.js <network> <btcTransactionHashInBlock>`

**CLI argument order:** `<network>` first, then a **txid of any confirmed transaction in the target block** (the tool loads that block’s coinbase). Same ordering as the `registerBtcTransaction` helper above.

Example (mainnet):

> node tool/getInformationReadyForRegisterBtcCoinbaseTransaction.js testnet fba7b0c2af3af7dfb90bf2dee036ec2e5060dbe9d32781cb65ea29f7b90d42de

It will return the following:

```js
{
  btcTxSerialized: '0x02000000010000000000000000000000000000000000000000000000000000000000000000ffffffff1c0357984b696e666f2e706167636f696e2e6f726797d4132300000000ffffffff023418000000000000160014fde35c99bafd23432486cf2d92705eee2adcda750000000000000000266a24aa21a9ed8669415d663fb74df795a760dac5f6b22cbcab8ded143871157f3f7790f32fe200000000',
  btcBlockHash: '0x000000000003dcb7bdd30f1a41e6c5d2a7ce7cd06ae4616ae88f288e1cb97051',
  pmtSerialized: '0x0200000002283881704874aae306064fb08a3973d6ed28d292266d5e2b2b14d26031c0825fde420db9f729ea65cb8127d3e9db60502eec36e0def20bb9dff73aafc2b0a7fb0103',
  witnessMerkleRoot: '0x75ce18d1887ecc0c0654969ba469be4cf057216574a8db1a520c44a70b220c1c',
  witnessReservedValue: '0x0000000000000000000000000000000000000000000000000000000000000000'
}
```

Then you can copy the `btcTxSerialized`, `btcBlockHash`, `pmtSerialized`, `witnessMerkleRoot` and `witnessReservedValue` as parameters to the Bridge `registerBtcCoinbaseTransaction` method.

You can use the Rootstock explorer to register the coinbase transaction following the same steps above.

## Test

To run test:

> npm test

For any comments or suggestions, feel free to contribute or reach out at our [Discord server](https://discord.gg/rootstock).
