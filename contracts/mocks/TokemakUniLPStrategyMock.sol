//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.4;
import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@uniswap/lib/contracts/libraries/Babylonian.sol";
import "../interfaces/IRewards.sol";
import "../interfaces/IManager.sol";
import "../interfaces/ILiquidityPool.sol";
import "../utils/UniswapV2Library.sol";

// @title Tokemak's UNI LP auto-compound strategy
// @author Daniel G.
// @notice Basic implementation of harvesting LP token rewards from Tokemak protocol
// @dev Solidity coding challengue for Ondo Finance interview
// @custz is an experimental contract.
contract TokemakUniLPStrategyMock is OwnableUpgradeable, IRewards {
    using SafeERC20 for IERC20;

    // @dev Staking Assets
    IUniswapV2Pair public uniV2LpTokensPairs;
    IERC20 public tokematAsset;
    IERC20 public wethAsset;

    // @dev Tokemak's contract dependencies
    IRewards public tokemakRwrdContract;
    IManager public tokemakManagerContract;
    ILiquidityPool public tokemakUniLpPool;

    // @dev UniswapV2 Router
    IUniswapV2Router02 public uniswapV2Router02;

    // @notice variables to keep track of stake amounts
    uint256 public stakes;

    // @dev Auto-compound events to store datapoints on chain
    event Deposit(address _investor, uint256 _amount);
    event Stake(address _investor, uint256 _amount);
    event Withdraw(address _investor, uint256 _amount);
    event RequestWithdraw(address _investor, uint256 _amount);

    // @notice Init strategy Tokemak's dependencies
    // @dev Returns Tokemaks contract instances for staking interactions
    // @param _wethAddress Wrapped Eth address
    // @param _tokemakRwrdContractAddress Tokemak's rewards controller address
    // @param _tokemakManagerContractAddress Tokemak's main manager controller address
    // @param _tokemakUniLpPoolAddress Tokemak's uniswap LP pool address
    // @param _uniswapV2Router02Address Un
    function initialize(
        address _tokemakUniLpPoolAddress,
        address _tokemakRwrdContractAddress,
        address _tokemakManagerContractAddress,
        address _uniswapV2Router02Address,
        address _wethAddress,
        address _tokeAddress,
        address _uniV2LpTokensPairsAddress
    ) public initializer {
        __Ownable_init();
        tokemakUniLpPool = ILiquidityPool(_tokemakUniLpPoolAddress);
        tokemakRwrdContract = IRewards(_tokemakRwrdContractAddress);
        tokemakManagerContract = IManager(_tokemakManagerContractAddress);
        uniswapV2Router02 = IUniswapV2Router02(_uniswapV2Router02Address);
        wethAsset = IERC20(_wethAddress);
        tokematAsset = IERC20(_tokeAddress);
        uniV2LpTokensPairs = IUniswapV2Pair(_uniV2LpTokensPairsAddress);
    }

    // @notice Deposits Uni LP tokens into contract callable by only owner
    // @dev Only Uni LP tokens for TOKE-ETH LP pool allowed
    // @dev Stakes all its deposits in Tokemak's UNI LP token pool
    // @param _amount Amount of UNI LP token to deposit
    function deposits(uint256 _amount) public onlyOwner {
        require(_amount > 0, "TUniLPS 03: Invalid deposit amount");

        // @dev Trasnfer UniLP token to this contract
        uniV2LpTokensPairs.transferFrom(_msgSender(), address(this), _amount);

        if (uniV2LpTokensPairs.balanceOf(address(this)) >= _amount) {

            emit Deposit(_msgSender(), _amount);
            stakes = _amount;
        } else {
            revert("TUniLPS 04: Deposit failed.");
        }

        // @dev stakes all deposits
        _stake(stakes);
        emit Stake(_msgSender(), _amount);
    }

    // @notice Stakes all its deposits in Tokemak's UNI LP token pool
    // @param _amount Amount of UNI LP tokens to stake
    function _stake(uint256 _amount) internal {
        uniV2LpTokensPairs.approve(address(tokemakUniLpPool), _amount);
        tokemakUniLpPool.deposit(_amount);
    }

    function rewardsSigner() external override returns (address) {
        return tokemakRwrdContract.rewardsSigner();
    }

    // @notice Claim Tokemak's rewards in Toke Asset for being LP
    // @param recipient Struct:
    //        chainId, cycle (epochs for funds management), wallet address, claim amount
    // @param v ECDSA signature v,
    // @param r ECDSA signature r,
    // @param s ECDSA signature s,
    function claim(
        Recipient calldata recipient,
        uint8 v,
        bytes32 r,
        bytes32 s // bytes calldata signature
    ) external override {
        tokemakRwrdContract.claim(recipient, v, r, s);
    }

    // @notice Get current claimable token rewards amount
    // @return amount to claim in the current cycle
    function getClaimableAmount(Recipient calldata recipient)
        external
        override
        returns (uint256)
    {
        return tokemakRwrdContract.getClaimableAmount(recipient);
    }

    // @notice Auto-compound call to claim and re-stake rewards
    // @dev Function call execute the following steps:
    // @dev 1.- Check for positive amount of toke rewards in current cycle
    // @dev 2.- Claim TOKE rewards
    // @dev 3.- Swap needed amount of total TOKE rewards to form token pair TOKE-ETH
    // @dev 4.- Provide liquidity to UniswapV2 to TOKE-ETH pool & Receive UNIV2 LP Token
    // @dev 5.- Stake UNIV2 LP Token into TOKEMAK Uni LP Token Pool
    // @param v ECDSA signature,
    // @param r ECDSA signature,
    // @param s ECDSA signature,
    function autoCompoundWithPermit(
        Recipient memory recipient,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        // @dev 1.- Check for positive amount of toke rewards in current cycle
        uint256 claimableRwrds = this.getClaimableAmount(recipient);
        uint256 tokemakBalance;

        // @dev 2.- Claim TOKE rewards
        if (claimableRwrds > 0) {
            this.claim(recipient, v, r, s);
            tokemakBalance = tokematAsset.balanceOf(address(this));
            require(
                tokemakBalance >= claimableRwrds,
                "TUniLPS 05: Rewards claim failed."
            );
        }
        // @dev 3.- Swap needed amount of total TOKE rewards to form token pair TOKE-ETH
        _buyWETH(tokemakBalance);

        uint256 wethBalance = wethAsset.balanceOf(address(this));
        // @dev 4.- Provide liquidity to UniswapV2 to TOKE-ETH pool
        (, , uint256 lpAmount) = addLiquidity(
            address(tokematAsset),
            address(wethAsset),
            tokemakBalance,
            wethBalance
        );
        // @dev 5.- Stake UNIV2 LP Token into TOKEMAK Uni LP Token Pool
        if (lpAmount > 0) _stake(lpAmount);
    }

    // @notice Buy needed WETHc to form token pair TOKE-ETH
    // @param _amount of weth to buy
    // @return Weth amount bought
    function _buyWETH(uint256 _amount) internal returns (uint256) {
        (uint256 reserveA, ) = UniswapV2Library.getReserves(
            uniswapV2Router02.factory(),
            address(tokematAsset),
            address(wethAsset)
        );

        // @dev ondo.fi use of Zapper's Babylonian function to balance amount of assets for LP pool
        uint256 amountToSwap = calculateSwapInAmount(reserveA, _amount);
        address[] memory path = new address[](2);
        path[0] = address(tokematAsset);
        path[1] = address(wethAsset);

        return swapExactTokens(amountToSwap, 0, path);
    }

    // @notice Exactly how much of userIn to swap to get perfectly balanced ratio for LP tokens
    // @dev This function is a Reused calculation from Ondo.fi sushistaking v2 strategy
    // @dev This code is cloned from L1242-1253 of UniswapV2_ZapIn_General_V4 at https://etherscan.io/address/0x5ACedBA6C402e2682D312a7b4982eda0Ccf2d2E3#code#L1242
    // @param reserveIn Amount of reserves for asset 0
    // @param userIn Availabe amount of asset 0 to swap
    // @return Amount of userIn to swap for asset 1
    function calculateSwapInAmount(uint256 reserveIn, uint256 userIn)
        internal
        pure
        returns (uint256)
    {
        return
            (Babylonian.sqrt(
                reserveIn * (userIn * 3988000 + reserveIn * 3988009)
            ) - reserveIn * 1997) / 1994;
    }

    // @notice Swaps an exact amount of input tokens for as many output tokens as possible,
    // @param amountIn Amount of input tokens to send
    // @param amountOutMin Minimum amount of output tokens to receive and avoid tx revert
    // @param path Array of toke addresses, single hop swapping path
    function swapExactTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] memory path
    ) internal returns (uint256) {
        IERC20(tokematAsset).safeIncreaseAllowance(
            address(uniswapV2Router02),
            amountIn
        );
        return
            uniswapV2Router02.swapExactTokensForTokens(
                amountIn,
                amountOutMin,
                path,
                address(this),
                block.timestamp
            )[path.length - 1];
    }

    // @notice Uniswapv2 function to add liquidity to existing pool
    // @param tokenA 1st pair asset address
    // @param tokenB 2nd pair asset address
    // @param amount0 Aount of 1st pair asset to add as liquidity
    // @param amount1 Amount of 2nd pair asset to add as liquidity
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amount0,
        uint256 amount1
    )
        internal
        returns (
            uint256 out0,
            uint256 out1,
            uint256 lp
        )
    {
        IERC20(tokenA).safeIncreaseAllowance(
            address(uniswapV2Router02),
            amount0
        );
        IERC20(tokenB).safeIncreaseAllowance(
            address(uniswapV2Router02),
            amount1
        );
        (out0, out1, lp) = uniswapV2Router02.addLiquidity(
            tokenA,
            tokenB,
            amount0,
            amount1,
            0,
            0,
            address(this),
            block.timestamp
        );
    }

    // @notice Request anticipated withdrawal to Tokemak's Uni LP pool
    // @dev Request will be served on next cycle (currently 7 days)
    function requestWithdrawal(uint256 _amount) public onlyOwner {
        require(
            _amount <= stakes,
            " TUniLPS 06: insufficient funds to withdraw."
        );
        tokemakUniLpPool.requestWithdrawal(_amount);
        emit RequestWithdraw(_msgSender(), _amount);
    }

    function currentCycle() external view returns(uint256 _cycle){
        _cycle = tokemakManagerContract.getCurrentCycle();
    }

    // @notice Withdrawal Tokemak's Uni LP tokens
    function withdraw(uint256 _amount) public onlyOwner {
        (uint256 minCycle, ) = tokemakUniLpPool.requestedWithdrawals(
            _msgSender()
        );
        require(
            minCycle > tokemakManagerContract.getCurrentCycleIndex(),
            "TUniLPS 07: Withdrawal not yet available."
        );
        require(
            _amount <= stakes,
            "TUniLPS 08: insufficient funds to withdraw."
        );
        stakes -= _amount;
        tokemakUniLpPool.withdraw(_amount);
        emit Withdraw(_msgSender(), _amount);
    }

    // @notice Returns chain Id
    function _getChainID() private view returns (uint256) {
        uint256 id;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            id := chainid()
        }
        return id;
    }

    function tokeToken() public override returns (IERC20) {
        return tokemakRwrdContract.tokeToken();
    }
}
