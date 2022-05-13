const TokemakUniLPStrategy = artifacts.require("TokemakUniLPStrategy");
const TokemakUniLPStrategyMock = artifacts.require("TokemakUniLPStrategyMock");
const { deployProxy } = require("@openzeppelin/truffle-upgrades");
const {
  TOKE_ETH_UNIV2_PAIR,
  TOKE_ASSET,
  WETH_ASSET,
  TOKEMAK_REWARDS_CONTRACT,
  TOKEMAK_MANAGER_CONTRACT,
  TOKEMAK_UNIV2_LP_TOKEN_POOL,
  UNIV2_ROUTER,
} = require("../deployments/helpers/address_lookup.js");

module.exports = async function (deployer,network,accounts) {
    console.log(accounts)
  /**
   * DEPLOY MOCK FOR WITHDRAWALS
   */
  let netId = "mainnet-fork";
  await deployProxy(TokemakUniLPStrategy, [], { deployer, initializer: false });
  const strategy  = await TokemakUniLPStrategy.deployed();
  await strategy.initialize(
    TOKEMAK_UNIV2_LP_TOKEN_POOL[netId],
    TOKEMAK_REWARDS_CONTRACT[netId],
    TOKEMAK_MANAGER_CONTRACT[netId],
    UNIV2_ROUTER[netId],
    WETH_ASSET[netId],
    TOKE_ASSET[netId],
    TOKE_ETH_UNIV2_PAIR[netId]
  );

  /**
   * DEPLOY MOCK FOR WITHDRAWALS
   */

   await deployer.deploy(TokemakUniLPStrategyMock);
   const strategyMock  = await TokemakUniLPStrategyMock.deployed();
   strategyMock.initialize(
     TOKEMAK_UNIV2_LP_TOKEN_POOL[netId],
     TOKEMAK_REWARDS_CONTRACT[netId],
     TOKEMAK_MANAGER_CONTRACT[netId],
     UNIV2_ROUTER[netId],
     WETH_ASSET[netId],
     TOKE_ASSET[netId],
     TOKE_ETH_UNIV2_PAIR[netId]
   );

};
