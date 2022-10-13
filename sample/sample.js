const pmtBuilder = require("../index");

const blockTransactions = [
    '8f01832aa125683490e70a9142ccd9c49485b84708180487b5f35dc7795a3afd',
    '6cc629897f3f6c3e873e98af8061f54618fe2be6599853841ca97aeb9614a136',
    '31c8227345ead8477845fda6d8dc68cc1bca9c094523aef60d857d521aca6937',
    'e0714cbc5ed04014e1a1f362612fdb05578a1c8e45257ac6cc0dff0d2e532855',
    '0f9e8932b5bbcad80242077205843e42bcca9d84c58b751535ea07a06e4179e6',
    '5a4d2446ff81be95eacaaac0fcd06856f9625f6f07391a2bf90b1a065be0e0fc'
];

const resultPmt = pmtBuilder.buildPMT(blockTransactions, blockTransactions[0]);

console.log("Block Transactions: ", blockTransactions);
console.log("Filtered Hash: ", blockTransactions[0]);
console.log("Result: ", resultPmt);
