//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.4;

import "hardhat/console.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

import "./interfaces/IRewards.sol";
import "./interfaces/IManager.sol";

contract TokemakUniLPStrategy is
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    IRewards
{
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    IERC20 public lpTokens;
    IERC20 public tokeAsset;
    IERC20 public wethAsset;
    IRewards public tokemakRwrdContract;
    IManager public tokemakManagerContract;

    uint256 public stakes;
    uint256 public deposits;
    uint256 public lpRewards;

    function initialize(
        address _tokeEthPairAddress,
        address _tokemakAddress,
        address _wethAddress,
        address _tokemakRwrdContractAddress,
        address _tokemakManagerContractAddress
    ) public initializer {
        __Ownable_init();
        __ReentrancyGuard_init();
        lpTokens = IERC20(_tokeEthPairAddress);
        tokeAsset = IERC20(_tokemakAddress);
        wethAsset = IERC20(_wethAddress);
        tokemakRwrdContract = IRewards(_tokemakRwrdContractAddress);
        tokemakManagerContract = IManager(_tokemakManagerContractAddress);
    }

    function deposit(address _asset, uint256 _amount) public onlyOwner {
        require(_asset != address(0), "Invalid asset address.");
        require(
            _asset == address(lpTokens),
            "Only TOKEMAK-ETH LP asset allowed."
        );
        require(_amount > 0, "Invalid deposit amount");

        /// @dev Trasnfer UniLP token to this contract
        IERC20(_asset).safeTransfer(address(this), _amount);
        require(
            IERC20(_asset).balanceOf(address(this)) >= _amount,
            "Deposit failed."
        );
        deposits = deposits.add(_amount);
    }

    function rewardsSigner() external override returns (address) {
        return tokemakRwrdContract.rewardsSigner();
    }

    function getClaimableAmount(Recipient calldata recipient)
        external
        override
        returns (uint256)
    {
        return tokemakRwrdContract.getClaimableAmount(recipient);
    }

    function _autoCompound() internal returns (bool) {
        address signer = this.rewardsSigner();
        console.log("signer: ", signer);

        uint256 latestCycleIndex = tokemakManagerContract.getCurrentCycleIndex();
        Recipient memory recipient = Recipient(
            _getChainID(),
            latestCycleIndex,
            _msgSender(),
            deposits
        );

        uint256 claimableRwrds = this.getClaimableAmount(recipient);
        console.log("claimableRwrds: ", claimableRwrds);
        return true;
    }

    function withdraw() public onlyOwner {}

    function claim(
        Recipient calldata recipient,
        uint8 v,
        bytes32 r,
        bytes32 s // bytes calldata signature
    ) external override {}

    function _getChainID() private view returns (uint256) {
        uint256 id;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            id := chainid()
        }
        return id;
    }
}
