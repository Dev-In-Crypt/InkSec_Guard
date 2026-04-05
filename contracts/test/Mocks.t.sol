// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {DrainerMock} from "../src/DrainerMock.sol";

/// @dev Malicious token that reenters DrainerMock.drain() during transferFrom
contract ReentrantToken {
    DrainerMock public target;
    bool public reentered;

    constructor(DrainerMock _target) { target = _target; }

    function balanceOf(address) external pure returns (uint256) { return 1; }

    function transferFrom(address, address, uint256) external returns (bool) {
        if (!reentered) {
            reentered = true;
            target.drain(address(this)); // attempt reentry
        }
        return true;
    }
}

contract MocksTest is Test {
    MockERC20   token;
    DrainerMock drainer;

    address owner  = address(0xBEEF);
    address victim = address(0xDEAD);
    address safe   = address(0xCAFE);

    uint256 constant INITIAL_BALANCE = 10_000 * 1e6; // 10,000 tUSDC

    function setUp() public {
        token   = new MockERC20();
        drainer = new DrainerMock(owner);
        token.mint(victim, INITIAL_BALANCE);
    }

    // ── MockERC20: basic functionality ───────────────────────────────

    function test_Mint_IncreasesBalance() public view {
        assertEq(token.balanceOf(victim), INITIAL_BALANCE);
        assertEq(token.totalSupply(), INITIAL_BALANCE);
    }

    function test_Transfer_MovesTokens() public {
        uint256 amount = 500 * 1e6;
        vm.prank(victim);
        token.transfer(safe, amount);

        assertEq(token.balanceOf(victim), INITIAL_BALANCE - amount);
        assertEq(token.balanceOf(safe), amount);
    }

    function test_Approve_SetsAllowance() public {
        vm.prank(victim);
        token.approve(address(drainer), type(uint256).max);
        assertEq(token.allowance(victim, address(drainer)), type(uint256).max);
    }

    // ── MockERC20: [FIX M-1] transfer to address(0) reverts ──────────

    function test_Transfer_RevertsToZeroAddress() public {
        vm.prank(victim);
        vm.expectRevert(MockERC20.ZeroAddress.selector);
        token.transfer(address(0), 100);
    }

    // ── MockERC20: [FIX M-2] mint to address(0) reverts ─────────────

    function test_Mint_RevertsToZeroAddress() public {
        vm.expectRevert(MockERC20.ZeroAddress.selector);
        token.mint(address(0), 1000);
    }

    // ── MockERC20: [FIX L-1] approve to address(0) reverts ──────────

    function test_Approve_RevertsZeroAddress() public {
        vm.prank(victim);
        vm.expectRevert(MockERC20.ZeroAddress.selector);
        token.approve(address(0), 100);
    }

    // ── MockERC20: insufficient balance / allowance ──────────────────

    function test_Transfer_RevertsInsufficientBalance() public {
        vm.prank(victim);
        vm.expectRevert(
            abi.encodeWithSelector(MockERC20.InsufficientBalance.selector, INITIAL_BALANCE, INITIAL_BALANCE + 1)
        );
        token.transfer(safe, INITIAL_BALANCE + 1);
    }

    function test_TransferFrom_RevertsInsufficientAllowance() public {
        vm.prank(victim);
        token.approve(safe, 100);

        vm.prank(safe);
        vm.expectRevert(
            abi.encodeWithSelector(MockERC20.InsufficientAllowance.selector, 100, 200)
        );
        token.transferFrom(victim, safe, 200);
    }

    // ── DrainerMock: basic functionality ────────────────────────────

    function test_Drain_TransfersFullBalance() public {
        vm.prank(victim);
        token.approve(address(drainer), type(uint256).max);

        vm.prank(victim);
        drainer.drain(address(token));

        assertEq(token.balanceOf(victim), 0);
        assertEq(token.balanceOf(owner), INITIAL_BALANCE);
    }

    function test_DrainFrom_TransfersFullBalance() public {
        vm.prank(victim);
        token.approve(address(drainer), type(uint256).max);

        drainer.drainFrom(address(token), victim);

        assertEq(token.balanceOf(victim), 0);
        assertEq(token.balanceOf(owner), INITIAL_BALANCE);
    }

    function test_Drain_RevertsWithNoApproval() public {
        vm.prank(victim);
        vm.expectRevert(
            abi.encodeWithSelector(MockERC20.InsufficientAllowance.selector, 0, INITIAL_BALANCE)
        );
        drainer.drain(address(token));
    }

    function test_Drain_RevertsWhenBalanceIsZero() public {
        address emptyWallet = address(0xABCD);
        vm.prank(emptyWallet);
        token.approve(address(drainer), type(uint256).max);

        vm.prank(emptyWallet);
        vm.expectRevert(DrainerMock.NothingToDrain.selector);
        drainer.drain(address(token));
    }

    // ── DrainerMock: [FIX M-3] zero-address owner reverts ────────────

    function test_Constructor_RevertsZeroOwner() public {
        vm.expectRevert(DrainerMock.ZeroAddress.selector);
        new DrainerMock(address(0));
    }

    // ── DrainerMock: [FIX H-2] reentrancy guard ─────────────────────

    function test_Drain_BlocksReentrancy() public {
        ReentrantToken maliciousToken = new ReentrantToken(drainer);

        // drain() with a malicious token should revert on the reentry attempt
        vm.expectRevert(DrainerMock.Reentrant.selector);
        drainer.drain(address(maliciousToken));
    }

    // ── DrainerMock: [FIX L-2] ETH forwarded to owner ───────────────

    function test_Receive_ForwardsETHToOwner() public {
        vm.deal(address(this), 1 ether);
        uint256 ownerBefore = owner.balance;

        (bool ok,) = address(drainer).call{value: 1 ether}("");
        assertTrue(ok);
        assertEq(owner.balance, ownerBefore + 1 ether);
    }
}
