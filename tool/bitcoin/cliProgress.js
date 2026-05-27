/**
 * Terminal progress line for CLI tools that fetch many block transactions.
 */

/**
 * Clears the current progress line written with `\r`.
 */
function clearProgressLine() {
    process.stdout.write('\x1b[2K\r');
}

/**
 * @param {string} label - Prefix shown before `current/total` (e.g. "Fetching transactions").
 * @returns {(currentIndex: number, totalCount: number) => void}
 */
function createProgressReporter(label) {
    return (currentIndex, totalCount) => {
        process.stdout.write(`${label}: ${currentIndex}/${totalCount}\r`);
    };
}

/**
 * @param {number} totalCount
 * @param {string} [suffix] - Optional text after the count (e.g. "Building PMT...").
 */
function logFetchTransactionsComplete(totalCount, suffix) {
    clearProgressLine();
    const tail = suffix ? ` ${suffix}` : '';
    console.log(`Finished fetching ${totalCount} transactions.${tail}`);
}

module.exports = {
    clearProgressLine,
    createProgressReporter,
    logFetchTransactionsComplete,
};
