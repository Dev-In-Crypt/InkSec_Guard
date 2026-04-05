// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title MockERC20 — InkSec Test USDC (testnet only)
/// @dev Intentionally has no access-control on mint() — testnet demo token.
contract MockERC20 {
    string public name     = "InkSec Test USDC";
    string public symbol   = "tUSDC";
    uint8  public decimals = 6;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    // ── Errors ──────────────────────────────────────────────────────

    error ZeroAddress();
    error InsufficientBalance(uint256 have, uint256 want);
    error InsufficientAllowance(uint256 have, uint256 want);

    // ── External ─────────────────────────────────────────────────────

    /// @notice Mint tokens to `to`. No access control — testnet only.
    function mint(address to, uint256 amount) external {
        // [FIX M-2] reject mint to zero address
        if (to == address(0)) revert ZeroAddress();
        // CEI: effects before events
        totalSupply      += amount;
        balanceOf[to]    += amount;
        emit Transfer(address(0), to, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        // [FIX L-1] reject approve to zero address
        if (spender == address(0)) revert ZeroAddress();
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        return _transfer(msg.sender, to, amount);
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            if (allowed < amount) revert InsufficientAllowance(allowed, amount);
            // CEI: update allowance (effect) before _transfer (interaction)
            allowance[from][msg.sender] = allowed - amount;
        }
        return _transfer(from, to, amount);
    }

    // ── Internal ─────────────────────────────────────────────────────

    function _transfer(address from, address to, uint256 amount) internal returns (bool) {
        // [FIX M-1] reject transfer to zero address — prevents totalSupply/balance drift
        if (to == address(0)) revert ZeroAddress();
        if (balanceOf[from] < amount) revert InsufficientBalance(balanceOf[from], amount);
        // CEI: effects before event
        balanceOf[from] -= amount;
        balanceOf[to]   += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}
