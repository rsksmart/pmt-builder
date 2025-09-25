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

First parameter {leaves}: An array of transaction hash of all transactions without witness(txid) in a block. 
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

This library can be used via a tool(this tool uses mempool.js api to get transactions) that exists in the tool/pmt-builder.js file via the following command: 

`node tool/pmt-builder.js network blockHash txHash`, 

For example: `node tool/pmt-builder.js testnet 00000000000003d91235b675366fc6c26e0ea4b2f125fd292f164247d4e5b07e ac72bd61c72ac8143e5638998f479bdfc5834fce9576fa2054c7be93313abd66`

`network`: testnet or mainnet
`blockHash`: block hash in hex format
`txHash`: filtered transaction hash in hex format

### Getting a pegin btc transaction information ready to register

The Bridge `registerBtcTransaction` method receives 3 parameters: `tx`, the raw btc transaction. `height`, the block height for this transaction. `pmt`, the Partial Merkle Tree of this transaction.

To ease the process of registering a pegin btc transaction, the function `getInformationReadyForRegisterBtcTransaction` gets these values for you, given a bitcoin network name (testnet, mainnet) and a btc transaction hash, ready to be sent to the Bridge `registerBtcTransaction` method without further setup.

This is how to use it:

> node getInformationReadyForRegisterBtcTransaction.js <network> <btcTransactionHash>

For example:

> node tool/getInformationReadyForRegisterBtcTransaction.js testnet ef659287588630175492aa4edb503bccc68cd1f6ddb0a4592221207da00bfe85

It will return the following:

```js
{
  tx: '0x020000000001018e318ececad7308f4019ed777e7237dc12b24c349f79200e8d6ac161c453d3320100000017160014c0aaa752c9df72552334d9140e9b21392ba16943ffffffff030000000000000000306a2e52534b5401f07c2ca1d1c890d264598780539c0ca598101bbe01b98b3a157ec0c7bf4eaf21eae0019f3ef4a6919420a107000000000017a9143b004aa2b568c97f80ccccc5130226d0e98bd58887b1d73a000000000017a914d0c62577195e3c4215214dec2bef63ced9772ed187024830450221009487e85601940fe8f3a05dd759a6f02caa701d0abe9537d1b734ed17febcbaff022024f6076fdfb7205e5ad5eb6a39f6adbfe4b0ef4a36cc3094ec5bf5400b5efa0e0121039c5fd084f482d2aed54964acd11908979f6ee8124c21cc2d826834e0a636c75200000000',
  height: 2939995,
  pmt: '0xb7000000093ff31f1463cc248fdd9d42c66c342fc5cc450c50a2d4c077684cab050bdd8a1085fe0ba07d20212259a4b0ddf6d18cc6cc3b50db4eaa925417308658879265ef37a24e862db80215882acbe9896377481ec24ff2b63e33721e060858989c490e9f31c62e83e01716cb74236974493ad0ee8e94736d602af9791b9161c4dcdcce1c04446d7b205c3e3c3c4273b6840c35ba8d0ff87b898a61305f5f79366c79e22f6a907208c88ca37aa225542b1444d3446f178ef542a48cc21f65a26fab0be576dfd8e4f6940df6584a342ddb41d10807cc09340c1d59be1dabc4fb004acfd46f21b7010bbc7dec0e65147cf55ed99b180bfbb9947d722f8bf51048b929bfa6e5e2ada7c1dfd06ec96ab73e8f9e9a2bf321157b4939da8c149a499385cb03e703bf0300'
}
```

Then you can copy the `tx`, `height` and `pmt` as parameters to the Bridge `registerBtcTransaction` method.

You can use the Rootstock explorer to register the transaction.

For testnet: https://explorer.testnet.rootstock.io/address/0x0000000000000000000000000000000001000006?tab=contract

For mainnet: https://explorer.rootstock.io/address/0x0000000000000000000000000000000001000006?tab=contract

Simply go to `Write Contract`, then click on `Connect Wallet`, Click on `registerBtcTransaction` to expand it, paste the data in their corresponding fields, and click on `Write`.

Notice that the hex value of these fields (`tx` and `pmt`) have the `0x` prefix, that's because the `registerBtcTransaction` requires them to be like that.

To check if it has been successfully registered, go to `Read Contract`, then click on `isBtcTxHashAlreadyProcessed` to expand it, paste the btc transaction hash and click on `Read`. If it returns `true`, then it has been registred. You can also use `getBtcTxHashProcessedHeight` to get the block number where it was processed.

### Getting a coinbase transaction information ready to register

The Bridge `registerBtcCoinbaseTransaction` method receives 5 parameters: `btcTxSerialized:`, the coinbase raw btc transaction. `btcBlockHash:`, the block hash for this transaction. `pmtSerialized:`, the Partial Merkle Tree of this transaction. `witnessMerkleRoot:`, the witness merkle root of the coinbase transaction. `witnessReservedValue:`, the witness reserved value of the coinbase transaction.

To ease the process of registering a coinbase transaction, the function `getInformationReadyForRegisterCoinbaseTransaction` gets these values for you, given a bitcoin network name (testnet, mainnet) and a btc transaction hash, ready to be sent to the Bridge `registerBtcCoinbaseTransaction` method without further setup.

This is how to use it:

> node getInformationReadyForRegisterCoinbaseTransaction.js <network> <btcTransactionHash>

For example:

> node tool/getInformationReadyForRegisterCoinbaseTransaction.js mainnet a3e666b1c03153d6eb857f3bca256a9c4515650b2d364507c5c422b56e01da1e

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
