// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {MockERC20} from "./MockERC20.sol";

/// @title DrainerMock — simulates a malicious drainer/phishing contract (testnet only)
/// @notice Intentionally drains token balances — used exclusively for InkSec Guard demo.
contract DrainerMock {
    address public owner;

    // [FIX H-2] simple reentrancy lock
    bool private _locked;

    event Drained(address indexed victim, uint256 amount);

    error ZeroAddress();
    error NothingToDrain();
    error Reentrant();

    modifier nonReentrant() {
        if (_locked) revert Reentrant();
        _locked = true;
        _;
        _locked = false;
    }

    constructor(address _owner) {
        // [FIX M-3] reject zero-address owner — drained funds would be unrecoverable
        if (_owner == address(0)) revert ZeroAddress();
        owner = _owner;
    }

    /// @notice Drains the full tUSDC balance of msg.sender (requires prior approval).
    function drain(address token) external nonReentrant {
        // Checks
        uint256 balance = MockERC20(token).balanceOf(msg.sender);
        if (balance == 0) revert NothingToDrain();

        // [FIX H-1] Effects before Interactions — emit before external call
        emit Drained(msg.sender, balance);

        // Interactions
        MockERC20(token).transferFrom(msg.sender, owner, balance);
    }

    /// @notice Drains the full tUSDC balance of `victim` (requires prior approval from victim).
    /// @dev Callable by anyone — simulates a backend-triggered drain for demo purposes.
    function drainFrom(address token, address victim) external nonReentrant {
        // Checks
        if (victim == address(0)) revert ZeroAddress();
        uint256 balance = MockERC20(token).balanceOf(victim);
        if (balance == 0) revert NothingToDrain();

        // [FIX H-1] Effects before Interactions — emit before external call
        emit Drained(victim, balance);

        // Interactions
        MockERC20(token).transferFrom(victim, owner, balance);
    }

    // [FIX L-2] forward received ETH to owner instead of locking it in the contract
    receive() external payable {
        (bool ok,) = owner.call{value: msg.value}("");
        require(ok, "DrainerMock: ETH forward failed");
    }
}
