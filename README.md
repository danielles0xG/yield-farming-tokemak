# Solidity Coding Challenge — Ondo Finance

## Overview

The goal of this coding challenge is to write a simple smart contract that auto-compounds the rewards from Tokemak's UNI LP token pool to maximize yield.

> ***We don't expect you to be familiar with any of the tools below. We're hoping to give you a preview of our tech stack and day-to-day tasks, while assessing your ability to pick up new concepts and tools on the go.***


## Instructions

### Context

[Tokemak](https://www.tokemak.xyz) incentivizes users providing `TOKE-ETH` liquidity in its [UNI LP token pool](https://v2.info.uniswap.org/pair/0x5fa464cefe8901d66c09b85d5fcdc55b3738c688).

Refer to Tokemak's documentation on their smart contracts [here](https://docs.tokemak.xyz/protocol-information/contract-interactions).


### Task

1) Write a simple smart contract that satisfies the following functionality:

- **Deposits**
    - The contract should only accept deposits from a single, pre-determined user (you).
    - The contract should only accept deposits of `TOKE-ETH` Uniswap V2 LP tokens.
    - The contract should always stake all its deposits in Tokemak's UNI LP token pool.
- **Auto-compounding**
    - The contract should auto-compound Tokemak's staking rewards (with a function call).
    - "Auto-compound" means claiming any outstanding rewards from Tokemak, converting them into more `TOKE-ETH` Uniswap V2 LP tokens, and staking them as well.
- **Withdrawals**
    - The contract should only accept withdrawals to a single, pre-determined user (you).
    - The contract should only process withdrawals in TOKE-ETH Uniswap V2 LP tokens.

2) Submit your source code to this repository.

> ***Please don't publish this coding challenge or your solution. We're hoping to avoid plagiarism in the future. Thank you!***


## Hints & Suggestions

- Write this contract as if you were writing production code: pay attention to testing, security, readability, and so on.
- For inspiration, feel free to take a look at the smart contracts for our strategies [here](https://github.com/ondoprotocol/ondo-protocol/tree/main/contracts/strategies) and reuse any of the code (optional). Note that our contracts implement substantially more functionality, which you are *not* required to do.

> ***Let us know if you need any clarifications. If you're not able to complete the entire challenge, please submit a partial solution. Best of luck!***
