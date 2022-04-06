// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

/**
 *  @title Controls the transition and execution of liquidity deployment cycles.
 *  Accepts instructions that can move assets from the Pools to the Exchanges
 *  and back. Can also move assets to the treasury when appropriate.
 */
interface IManager {
    ///@notice Gets addresses of all pools registered
    ///@return Memory array of pool addresses
    function getPools() external view returns (address[] memory);

    ///@notice Gets ids of all controllers registered
    ///@return Memory array of Bytes32 controller ids
    function getControllers() external view returns (bytes32[] memory);

    ///@notice Allows for owner to set cycle duration
    ///@param duration Block durtation of cycle
    function setCycleDuration(uint256 duration) external;

    ///@notice Starts cycle rollover
    ///@dev Sets rolloverStarted state boolean to true
    function startCycleRollover() external;

    ///@notice Completes cycle rollover, publishes rewards hash to ipfs
    ///@param rewardsIpfsHash rewards hash uploaded to ipfs
    function completeRollover(string calldata rewardsIpfsHash) external;

    ///@notice Gets reward hash by cycle index
    ///@param index Cycle index to retrieve rewards hash
    ///@return String memory hash
    function cycleRewardsHashes(uint256 index)
        external
        view
        returns (string memory);

    ///@notice Gets current starting block
    ///@return uint256 with block number
    function getCurrentCycle() external view returns (uint256);

    ///@notice Gets current cycle index
    ///@return uint256 current cycle number
    function getCurrentCycleIndex() external view returns (uint256);

    ///@notice Gets current cycle duration
    ///@return uint256 in block of cycle duration
    function getCycleDuration() external view returns (uint256);

    ///@notice Gets cycle rollover status, true for rolling false for not
    ///@return Bool representing whether cycle is rolling over or not
    function getRolloverStatus() external view returns (bool);

    /// @notice Sets next cycle start time manually
    /// @param nextCycleStartTime uint256 that represents start of next cycle
    function setNextCycleStartTime(uint256 nextCycleStartTime) external;

    /// @notice Sweeps amanager contract for any leftover funds
    /// @param addresses array of addresses of pools to sweep funds into
    function sweep(address[] calldata addresses) external;

    /// @notice Setup a role using internal function _setupRole
    /// @param role keccak256 of the role keccak256("MY_ROLE");
    function setupRole(bytes32 role) external;
}
