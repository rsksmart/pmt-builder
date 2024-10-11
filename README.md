![Github CI/CD](https://github.com/rsksmart/pmt-builder/actions/workflows/workflow.yml/badge.svg)

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

To ease the process of registering a pegin btc transaction, the function `getInformationReadyForRegisterBtcTransaction` gets these values for you, given a bitcoin network name (testnet, mainnet) and a btc transaction, ready to be sent to the Bridge `registerBtcTransaction` without further setup.

This is how to use it:

> node getInformationReadyForRegisterBtcTransaction.js <network> <btcTransactionHash>

For example:

> node tool/getInformationReadyForRegisterBtcTransaction.js testnet ef659287588630175492aa4edb503bccc68cd1f6ddb0a4592221207da00bfe85

It will return the following:

```js
{
  network: 'testnet',
  blockHash: '000000000000391f9a9f4283196d3575dbde8d79c73fef3954ca9a1c3159b72f',
  transactionHash: 'ef659287588630175492aa4edb503bccc68cd1f6ddb0a4592221207da00bfe85',
  tx: '0x020000000001018e318ececad7308f4019ed777e7237dc12b24c349f79200e8d6ac161c453d3320100000017160014c0aaa752c9df72552334d9140e9b21392ba16943ffffffff030000000000000000306a2e52534b5401f07c2ca1d1c890d264598780539c0ca598101bbe01b98b3a157ec0c7bf4eaf21eae0019f3ef4a6919420a107000000000017a9143b004aa2b568c97f80ccccc5130226d0e98bd58887b1d73a000000000017a914d0c62577195e3c4215214dec2bef63ced9772ed187024830450221009487e85601940fe8f3a05dd759a6f02caa701d0abe9537d1b734ed17febcbaff022024f6076fdfb7205e5ad5eb6a39f6adbfe4b0ef4a36cc3094ec5bf5400b5efa0e0121039c5fd084f482d2aed54964acd11908979f6ee8124c21cc2d826834e0a636c75200000000',
  height: 2939995,
  pmt: '0xb7000000093ff31f1463cc248fdd9d42c66c342fc5cc450c50a2d4c077684cab050bdd8a1085fe0ba07d20212259a4b0ddf6d18cc6cc3b50db4eaa925417308658879265ef37a24e862db80215882acbe9896377481ec24ff2b63e33721e060858989c490e9f31c62e83e01716cb74236974493ad0ee8e94736d602af9791b9161c4dcdcce1c04446d7b205c3e3c3c4273b6840c35ba8d0ff87b898a61305f5f79366c79e22f6a907208c88ca37aa225542b1444d3446f178ef542a48cc21f65a26fab0be576dfd8e4f6940df6584a342ddb41d10807cc09340c1d59be1dabc4fb004acfd46f21b7010bbc7dec0e65147cf55ed99b180bfbb9947d722f8bf51048b929bfa6e5e2ada7c1dfd06ec96ab73e8f9e9a2bf321157b4939da8c149a499385cb03e703bf0300'
}
```

Then you can copy the `tx`, `height` and `pmt` as parameters to the Bridge `registerBtcTransaction` method.

Notice that the hex value of these fields (`tx` and `pmt`) have the `0x` prefix, that's because the `registerBtcTransaction` requires them to be like that.

## Test

To run test:

> npm test

For any comments or suggestions, feel free to contribute or reach out at our [open slack](https://developers.rsk.co/slack).
