const { expect } = require("chai");
const { ethers } = require("hardhat");
const hre = require("hardhat");


before(async function () {
  const StrategyInstance = await ethers.getContractFactory("TokemakUniLPStrategy");
  const strategy = await  StrategyInstance.deploy();
});

describe("Auto-compound", function () {
  it("Should claim TOKE rewards & re-invest", async function () {

  });
});


