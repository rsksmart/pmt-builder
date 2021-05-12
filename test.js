let expect = require('chai').expect;
let pmtBuilder = require('./pmt-builder');

describe('PMT Builder', () => {
    it('should create valid PMT', () => {
        let expectedPMT = '0600000006fd3a5a79c75df3b58704180847b88594c4d9cc42910ae790346825a12a83018f36a11496eb7aa91c84539859e62bfe1846f56180af983e873e6c3f7f8929c66c3769ca1a527d850df6ae2345099cca1bcc68dcd8a6fd457847d8ea457322c8315528532e0dff0dccc67a25458e1c8a5705db2f6162f3a1e11440d05ebc4c71e0e679416ea007ea3515758bc5849dcabc423e840572074202d8cabbb532899e0ffce0e05b061a0bf92b1a39076f5f62f95668d0fcc0aacaea95be81ff46244d5a02ff0f';
        let transactions =  [
            "8f01832aa125683490e70a9142ccd9c49485b84708180487b5f35dc7795a3afd",
            "6cc629897f3f6c3e873e98af8061f54618fe2be6599853841ca97aeb9614a136",
            "31c8227345ead8477845fda6d8dc68cc1bca9c094523aef60d857d521aca6937",
            "e0714cbc5ed04014e1a1f362612fdb05578a1c8e45257ac6cc0dff0d2e532855",
            "0f9e8932b5bbcad80242077205843e42bcca9d84c58b751535ea07a06e4179e6",
            "5a4d2446ff81be95eacaaac0fcd06856f9625f6f07391a2bf90b1a065be0e0fc"
          ];

        // The PMTs should all match as this implementation simply generates a partial
        // tree using all its leaves regardless of the filtered transaction

        let pmt1 = pmtBuilder.buildPMT([].concat(transactions), transactions[0]);
        expect(expectedPMT, pmt1.hex).to.be.equals;
        let pmt2 = pmtBuilder.buildPMT([].concat(transactions), transactions[1]);
        expect(pmt1.hex, pmt2.hex).to.be.equals;
        let pmt3 = pmtBuilder.buildPMT([].concat(transactions), transactions[transactions.length - 1]);
        expect(pmt1.hex, pmt3.hex).to.be.equals;
    });
});
