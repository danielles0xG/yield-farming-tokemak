const { expect } = require("chai");
const { ethers, utils} = require("hardhat");
const BigNumber = require("bignumber.js");

const {sign2612} = require('./helpers/signatures');

function toBN(number) {
  return new BigNumber(number);
}

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

let strategy;
let netId = hre.network.name;
let owner, uniLpToken;
let signature = {};
const investmentAmount = toBN("13170000000000000").toString();

/**
 * Testing over mainnet fork since Tokemak's contracts
 * seem to be no available on testnets
 */
before(async function(){
   [owner, addr1, addr2] = await ethers.getSigners();
   const buffer = Buffer.from(user1PrivateKey, 'hex');

   let currentCycle = await strategy.tokemakManagerContract();
   currentCycle = await currentCycle.getCurrentCycleIndex();

   let verifier = await strategy.tokemakRwrdContract();
   verifier = await verifier.rewardsSigner();

   const contractData = {
     name: 'Ondo Fi', 
     verifyingContract: verifier
   };

   const recipient = {
     chainId:1,
     cycle: currentCycle,
     wallet: strategy.address,
     amount: investmentAmount
   }
   const {v, r, s} = sign2612(contractData, recipient, buffer);
   signature = {
     recipient,v,r,s
   }
});



beforeEach(async function () {   
  const StrategyInstance = await ethers.getContractFactory("TokemakUniLPStrategyMock");
   uniLpToken = await hre.ethers.getContractAt("UniswapV2Pair", TOKE_ETH_UNIV2_PAIR[netId]);

  strategy = await StrategyInstance.deploy();
  await strategy.initialize(
    TOKE_ETH_UNIV2_PAIR[netId],
    TOKE_ASSET[netId],
    WETH_ASSET[netId],
    TOKEMAK_REWARDS_CONTRACT[netId],
    TOKEMAK_MANAGER_CONTRACT[netId],
    TOKEMAK_UNIV2_LP_TOKEN_POOL[netId],
    UNIV2_ROUTER[netId]
  );
});

describe("Test initial deposits & stake", function () {
  it("Should deposit into Strategy", async function () {
    const uniLpToken = await hre.ethers.getContractAt("IUniswapV2PairMock", TOKE_ETH_UNIV2_PAIR[netId]);
    await uniLpToken.approve(strategy.address, investmentAmount); 
    await strategy.functions.deposits(TOKE_ETH_UNIV2_PAIR[netId], investmentAmount);
    await strategy.autoCompoundWithPermit();
    const lpBalance = await uniLpToken.balanceOf(owner);
    expect(lpBalance).to.be.above(0); 
  });

});

describe("Test Auto-compound with permit", function () {
  it("Should Auto-compound", async function () {
    const uniLpToken = await hre.ethers.getContractAt("UniswapV2Pair", TOKE_ETH_UNIV2_PAIR[netId]);
    await strategy.autoCompoundWithPermit(
      signature.recipient, signature.v,signature.r,signature.s
    );

      const lpBalance = await uniLpToken.balanceOf(owner);
      expect(lpBalance).to.be.above(0);
  });

  describe("Test Withdraw", function () {
    it("Should  requestWithdrawal Lp tokens", async function () {
      const lpBalance = await uniLpToken.balanceOf(owner);
      strategy.requestWithdrawal(lpBalance);
    });

    // 7 days epoch for withdrawal amount available
    it("Should  withdraw Lp tokens", async function () {
      const lpBalance = await uniLpToken.balanceOf(owner);
      strategy.withdraw(lpBalance);
    });
  });

});
