require("dotenv").config();
const { expect } = require("chai");
const { ethers, utils } = require("hardhat");
const BigNumber = require("bignumber.js");

const { sign } = require("./helpers/signatures");

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

before(async function () {
  const StrategyInstance = await ethers.getContractFactory(
    "TokemakUniLPStrategy"
  );
  uniLpToken = await hre.ethers.getContractAt(
    "UniswapV2Pair",
    TOKE_ETH_UNIV2_PAIR[netId]
  );

  strategy = await StrategyInstance.deploy();
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

/**
 *  Sign claiming request for toke rewards
 */
before(async function () {
  [owner, addr1, addr2] = await ethers.getSigners();
  const buffer = Buffer.from(process.env.TEST_ETH_ACCOUNT_PRIVATE_KEY, "hex");

  const manager = await hre.ethers.getContractAt(
    "IManager",
    TOKEMAK_MANAGER_CONTRACT[netId]
  );
  const currentCycle = await manager.getCurrentCycleIndex();

  const rewards = await hre.ethers.getContractAt(
    "IRewards",
    TOKEMAK_REWARDS_CONTRACT[netId]
  );
  const verifier = await rewards.rewardsSigner();

  const contractData = {
    name: "Ondo Fi",
    verifyingContract: verifier,
  };

  const recipient = {
    chainId: 1,
    cycle: currentCycle,
    wallet: strategy.address,
    amount: investmentAmount,
  };
  const { v, r, s } = sign(contractData, recipient, buffer);
  signature = {
    recipient,
    v,
    r,
    s,
  };
});

describe("Test initial deposits & stake", function () {
  it("Should deposit into Strategy", async function () {
    const uniLpToken = await hre.ethers.getContractAt(
      "IUniswapV2Pair",
      TOKE_ETH_UNIV2_PAIR[netId]
    );
    await uniLpToken.approve(strategy.address, investmentAmount);
    await strategy.functions.deposits(
      TOKE_ETH_UNIV2_PAIR[netId],
      investmentAmount
    );
    await strategy.autoCompoundWithPermit();
    const lpBalance = await uniLpToken.balanceOf(owner);
    expect(lpBalance).to.be.above(0);
  });
});

describe("Test Auto-compound with permit", function () {
  it("Should Auto-compound", async function () {
    const uniLpToken = await hre.ethers.getContractAt(
      "UniswapV2Pair",
      TOKE_ETH_UNIV2_PAIR[netId]
    );
    await strategy.autoCompoundWithPermit(
      signature.recipient,
      signature.v,
      signature.r,
      signature.s
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
