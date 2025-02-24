const path = require('path');
const programDir = path.join(__dirname, '.', 'programs/totem');
const idlDir = path.join(__dirname, 'totem-idl');
const sdkDir = path.join(__dirname, 'totem_sdk/src/generated');
const binaryInstallDir = path.join(__dirname, '.crates');

module.exports = {
    idlGenerator: 'anchor',
    programName: 'totem',
    programId: 'totAWMiimTLs7yTLAfWtJMmtNKmT5xpU6YM8vAYoqZ5',
    idlDir,
    sdkDir,
    binaryInstallDir,
    programDir,
    anchorRemainingAccounts: true
};