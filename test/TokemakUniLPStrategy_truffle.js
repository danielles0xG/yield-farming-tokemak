const Strategy = artifacts.require("TokemakUniLPStrategy");
const StrategyMock = artifacts.require("TokemakUniLPStrategyMock");
const IUniswapV2Pair = artifacts.require("IUniswapV2Pair");
const ILiquidityPool = artifacts.require("ILiquidityPool");
const { BN, web3 } = require("@openzeppelin/test-helpers/src/setup");
const { toWei, fromWei } = web3.utils;
const BigNumber = require("bignumber.js");
const { expect } = require("chai");
const toBN = (number) =>  new BigNumber(number);
const ethers = require('ethers');
const truffleAssert = require("truffle-assertions");


function logTransaction(tx, name) {
    console.log(`Transaction ${name}: gas used ${tx.receipt.gasUsed}, hash ${tx.tx}`);
}

const {
    TOKE_ETH_UNIV2_PAIR,
    TOKE_ASSET,
    WETH_ASSET,
    TOKEMAK_REWARDS_CONTRACT,
    TOKEMAK_MANAGER_CONTRACT,
    TOKEMAK_UNIV2_LP_TOKEN_POOL,
    UNIV2_ROUTER,
  } = require("../deployments/helpers/address_lookup.js");

/**
 * MAINNET-FORK TESTING
 */
contract("TokemakUniLPStrategy", (accounts) => {
    let DEPLOYER = accounts[0];
    let ADMIN  = accounts[accounts.length -1]

    let netId = "mainnet-fork";
    let investmentAmount = toBN("13170000000000000").toString();

    let strategy;
    let strategyMock;
    let uniLpToken;
    let liquidityPool;

    beforeEach("Strategy setup", async () => {
        strategy = await Strategy.new();
        strategyMock = await StrategyMock.new();
        uniLpToken = await IUniswapV2Pair.at(UNIV2_ROUTER[netId]);
        liquidityPool = await ILiquidityPool.at(TOKEMAK_UNIV2_LP_TOKEN_POOL[netId]);
        await strategy.initialize(
            TOKEMAK_UNIV2_LP_TOKEN_POOL[netId],
            TOKEMAK_REWARDS_CONTRACT[netId],
            TOKEMAK_MANAGER_CONTRACT[netId],
            UNIV2_ROUTER[netId],
            WETH_ASSET[netId],
            TOKE_ASSET[netId],
            TOKE_ETH_UNIV2_PAIR[netId]
          );
    });


    describe("Deposit into strategy", () => {
        it("Should deposit and stake every deposit", async () => {
                logTransaction(
                    await uniLpToken.approve(strategy.address, investmentAmount, {from:ADMIN}),
                    "init permit"
                    );
                
                // test deposit
                const tx = await strategy.deposits(investmentAmount,{from:ADMIN});
                truffleAssert.eventEmitted(tx, "Stake", (ev) => {
                    return ev._investor === ADMIN && ev._amount === investmentAmount;
                });
        });
    });


});            
