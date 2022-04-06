const hre = require("hardhat");
const {
  TOKE_ETH_UNIV2_PAIR,
  TOKE_ASSET,
  WETH_ASSET,
  TOKEMAK_REWARDS_CONTRACT,
  TOKEMAK_MANAGER_CONTRACT,
  TOKEMAK_UNIV2_LP_TOKEN_POOL,
  UNIV2_ROUTER,
} = require("../deployments/helpers/address_lookup.js");

async function main() {
  const netId = await hre.network.name;

  // Get Artifact
  const Strategy = await hre.ethers.getContractFactory("TokemakUniLPStrategy");

  // Deploy Contract
  const strategy = await Strategy.deploy();
  await strategy.initialize(
    TOKE_ETH_UNIV2_PAIR[netId],
    TOKE_ASSET[netId],
    WETH_ASSET[netId],
    TOKEMAK_REWARDS_CONTRACT[netId],
    TOKEMAK_MANAGER_CONTRACT[netId],
    TOKEMAK_UNIV2_LP_TOKEN_POOL[netId],
    UNIV2_ROUTER[netId]
  );

  console.log("strategy deployed to:", strategy.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
