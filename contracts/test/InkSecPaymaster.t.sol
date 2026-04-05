// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {EntryPoint} from "account-abstraction/core/EntryPoint.sol";
import {IEntryPoint} from "account-abstraction/interfaces/IEntryPoint.sol";
import {PackedUserOperation} from "account-abstraction/interfaces/PackedUserOperation.sol";
import {InkSecPaymaster} from "../src/InkSecPaymaster.sol";

contract InkSecPaymasterTest is Test {
    EntryPoint       entryPoint;
    InkSecPaymaster  paymaster;

    address owner    = address(0xBEEF);
    address attacker = address(0xBAD);
    address drainer  = address(0xDEAD1);
    address safe     = address(0xC0FFEE);

    // Standard execute(address,uint256,bytes) selector
    bytes4 constant EXECUTE_SELECTOR = bytes4(keccak256("execute(address,uint256,bytes)"));

    function setUp() public {
        entryPoint = new EntryPoint();
        vm.prank(owner);
        paymaster = new InkSecPaymaster(IEntryPoint(address(entryPoint)));
    }

    // ── Helpers ────────────────────────────────────────────────────────

    /// Build a minimal PackedUserOperation with callData targeting `to`.
    function _buildUserOp(address to) internal pure returns (PackedUserOperation memory op) {
        op.sender             = address(0x1234);
        op.nonce              = 0;
        op.initCode           = new bytes(0);
        op.callData           = abi.encodeWithSelector(EXECUTE_SELECTOR, to, 0, new bytes(0));
        op.accountGasLimits   = bytes32(uint256(200_000) << 128 | uint256(100_000));
        op.preVerificationGas = 50_000;
        op.gasFees            = bytes32(uint256(1e9) << 128 | uint256(1e9));
        op.paymasterAndData   = new bytes(0);
        op.signature          = new bytes(0);
    }

    /// Call validatePaymasterUserOp as if we are the EntryPoint.
    function _validate(PackedUserOperation memory op)
        internal
        returns (bytes memory context, uint256 validationData)
    {
        vm.prank(address(entryPoint));
        return paymaster.validatePaymasterUserOp(op, bytes32(0), 0);
    }

    // ── Blacklist management ───────────────────────────────────────────

    function test_AddToBlacklist_OnlyOwner() public {
        vm.prank(owner);
        paymaster.addToBlacklist(drainer);
        assertTrue(paymaster.isBlacklisted(drainer));
    }

    function test_AddToBlacklist_RevertsForNonOwner() public {
        vm.prank(attacker);
        vm.expectRevert();  // OwnableUnauthorizedAccount
        paymaster.addToBlacklist(drainer);
    }

    function test_RemoveFromBlacklist_OnlyOwner() public {
        vm.prank(owner);
        paymaster.addToBlacklist(drainer);

        vm.prank(owner);
        paymaster.removeFromBlacklist(drainer);
        assertFalse(paymaster.isBlacklisted(drainer));
    }

    function test_RemoveFromBlacklist_RevertsForNonOwner() public {
        vm.prank(owner);
        paymaster.addToBlacklist(drainer);

        vm.prank(attacker);
        vm.expectRevert();  // OwnableUnauthorizedAccount
        paymaster.removeFromBlacklist(drainer);
    }

    function test_AddToBlacklist_RevertsZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(InkSecPaymaster.InkSecPaymaster__ZeroAddress.selector);
        paymaster.addToBlacklist(address(0));
    }

    // ── Validation: clean address ──────────────────────────────────────

    function test_Validate_AcceptsCleanAddress() public {
        PackedUserOperation memory op = _buildUserOp(safe);
        (, uint256 vd) = _validate(op);
        // SIG_VALIDATION_SUCCESS = 0
        assertEq(vd, 0);
    }

    function test_Validate_AcceptsAfterRemovalFromBlacklist() public {
        vm.prank(owner);
        paymaster.addToBlacklist(drainer);
        vm.prank(owner);
        paymaster.removeFromBlacklist(drainer);

        PackedUserOperation memory op = _buildUserOp(drainer);
        (, uint256 vd) = _validate(op);
        assertEq(vd, 0);
    }

    // ── Validation: blacklisted address ───────────────────────────────

    function test_Validate_RevertsBlacklistedTarget() public {
        vm.prank(owner);
        paymaster.addToBlacklist(drainer);

        PackedUserOperation memory op = _buildUserOp(drainer);
        vm.prank(address(entryPoint));
        vm.expectRevert(
            abi.encodeWithSelector(
                InkSecPaymaster.InkSecPaymaster__BlacklistedTarget.selector,
                drainer
            )
        );
        paymaster.validatePaymasterUserOp(op, bytes32(0), 0);
    }

    function test_Validate_RevertsOnlyBlacklistedNotSafe() public {
        vm.prank(owner);
        paymaster.addToBlacklist(drainer);

        // safe address still works
        PackedUserOperation memory op = _buildUserOp(safe);
        (, uint256 vd) = _validate(op);
        assertEq(vd, 0);

        // drainer fails
        op = _buildUserOp(drainer);
        vm.prank(address(entryPoint));
        vm.expectRevert(
            abi.encodeWithSelector(
                InkSecPaymaster.InkSecPaymaster__BlacklistedTarget.selector,
                drainer
            )
        );
        paymaster.validatePaymasterUserOp(op, bytes32(0), 0);
    }

    // ── Validation: edge cases ─────────────────────────────────────────

    function test_Validate_AllowsShortCalldata() public {
        // callData shorter than MIN_CALLDATA (36 bytes) — skip blacklist check
        PackedUserOperation memory op = _buildUserOp(safe);
        op.callData = new bytes(0);  // empty callData (e.g. account deployment)
        (, uint256 vd) = _validate(op);
        assertEq(vd, 0);
    }

    function test_Validate_RevertsWhenCalledByNonEntryPoint() public {
        PackedUserOperation memory op = _buildUserOp(safe);
        vm.prank(attacker);
        vm.expectRevert("Sender not EntryPoint");
        paymaster.validatePaymasterUserOp(op, bytes32(0), 0);
    }

    // ── Events ──────────────────────────────────────────────────────────

    function test_Event_AddedToBlacklist() public {
        vm.prank(owner);
        vm.expectEmit(true, false, false, false);
        emit InkSecPaymaster.AddedToBlacklist(drainer);
        paymaster.addToBlacklist(drainer);
    }

    function test_Event_RemovedFromBlacklist() public {
        vm.prank(owner);
        paymaster.addToBlacklist(drainer);

        vm.prank(owner);
        vm.expectEmit(true, false, false, false);
        emit InkSecPaymaster.RemovedFromBlacklist(drainer);
        paymaster.removeFromBlacklist(drainer);
    }
}
