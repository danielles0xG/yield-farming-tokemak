require("dotenv").config();
const { expect } = require("chai");
const BigNumber = require("bignumber.js");
const Rewards = require("./abi/Rewards.json")
const hre = require("hardhat");
const { sign } = require("./helpers/signatures")
const ManagerABI = require("../contracts/utils/abi/Manager.json")
function toBN(number) {
  return new BigNumber(number);
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

let strategy;
let netId = hre.network.name;
let owner, uniLpToken;
let signature = {};
const investmentAmount = toBN("13170000000000000").toString();

/**
 * Testing over mainnet fork since Tokemak's contracts
 * seem to be no available on testnets
 */

beforeEach(async function () {
  [owner, addr1, addr2] = await ethers.getSigners();
  const StrategyInstance = await ethers.getContractFactory("TokemakUniLPStrategy");
  // uniLpToken = await ethers.getContractAt("UniswapV2Pair",TOKE_ETH_UNIV2_PAIR[netId]);
  // console.log(await uniLpToken.decimals())

  strategy = await StrategyInstance.deploy();
  await strategy.initialize(
    TOKEMAK_UNIV2_LP_TOKEN_POOL[netId],
    TOKEMAK_REWARDS_CONTRACT[netId],
    TOKEMAK_MANAGER_CONTRACT[netId],
    UNIV2_ROUTER[netId],
    WETH_ASSET[netId],
    TOKE_ASSET[netId],
    TOKE_ETH_UNIV2_PAIR[netId]
  )
});


/********************** */
//    Deposits  
/********************** */

describe("Test initial deposits & stake", function () {
  it("Should deposit into Strategy", async function () {
    
    // get UniswapV2 TOKE-ETH pair token
    const uniLpToken = await hre.ethers.getContractAt("IUniswapV2Pair",TOKE_ETH_UNIV2_PAIR[netId]);
    
    // Approve deposit
    await uniLpToken.approve(strategy.address, investmentAmount);

    // Deposit
    await strategy.functions.deposits(TOKE_ETH_UNIV2_PAIR[netId],investmentAmount);
    
    // call Autocompound
    await strategy.autoCompoundWithPermit();

    // Test owner's balance after deposit/farming
    const lpBalance = await uniLpToken.balanceOf(owner);
    expect(lpBalance).to.be.above(0);
  });
});


/********************** */
//    Auto Compound  
/********************** */

describe("Test Auto-compound with permit", function () {
  it("Should Auto-compound", async function () {

/** Signature ** */
const buffer = Buffer.from(process.env.TEST_ETH_ACCOUNT_PRIVATE_KEY, "hex");
 const manager = await new ethers.Contract( TOKEMAK_MANAGER_CONTRACT[netId], ManagerABI, owner);
 const res = await manager.functions.getCurrentCycleIndex();
 console.log("manager: ",res )

  // const rewards = await ethers.Contract(TOKEMAK_REWARDS_CONTRACT[netId],);


  // const verifier = await TokeRewards.rewardsSigner();
  // console.log("verifier: ",await verifier);
  const contractData = {
    name: "Ondo Fi",
    version: '1',
    chainId: 1,
    verifyingContract: "verifier",
  };
  const recipient = {
    chainId: 1,
    cycle: 1,//currentCycle,
    wallet: 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D,//strategy.address,
    amount: investmentAmount,
  };

  const { v, r, s } ={v:"v",r:"r",s:"s",}// sign(contractData, recipient, buffer);
  signature = {
    recipient,
    v,
    r,
    s,
  };

/** Signature End ** */

    const uniLpToken = await hre.ethers.getContractAt("UniswapV2Pair",TOKE_ETH_UNIV2_PAIR[netId]);
    await strategy.autoCompoundWithPermit(
      signature.recipient,
      signature.v,
      signature.r,
      signature.s
    );

    const lpBalance = await uniLpToken.balanceOf(owner);
    expect(lpBalance).to.be.above(0);
  });
});


/********************** */
//    WITHDRAWALS  
/********************** */

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