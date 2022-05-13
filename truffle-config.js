const HDWalletProvider = require("@truffle/hdwallet-provider");
const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  migrations_directory: "./migrations",
  networks: {
    development: {
      host: "127.0.0.1", // Localhost (default: none)
      port: 7545, // Standard Ethereum port (default: none)
      network_id: "*", // Any network (default: none)
  },
  "mainnet-fork": {
      provider: () => new HDWalletProvider([
        '0xd9a76cadd1009078a7f4b501de2dc4041b5678c5beb4ff5ff822bf4185ed7233',
        '0x9a2ace427487bede1236a1b38a78c429e45d749fef12b6b4419f901c633d8d81'
      ], `http://127.0.0.1:8545`),
      skipDryRun: true,
      network_id: "*", // Any network (default: none)
      chainId: 1,
     },
  },
  mocha: {
    timeout: 1000000
  },
 compilers: {
    solc: {
      version: "0.8.4",    // Fetch exact version from solc-bin (default: truffle's version)
      docker: false,        // Use "0.5.1" you've installed locally with docker (default: false)
      settings: {          // See the solidity docs for advice about optimization and evmVersion
       optimizer: {
         enabled: false,
         runs: 200
       },
    }
  },
},
mocha: {
  timeout: 100000,
},
};
