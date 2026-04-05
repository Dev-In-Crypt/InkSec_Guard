// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {BasePaymaster} from "account-abstraction/core/BasePaymaster.sol";
import {IEntryPoint} from "account-abstraction/interfaces/IEntryPoint.sol";
import {PackedUserOperation} from "account-abstraction/interfaces/PackedUserOperation.sol";
import {SIG_VALIDATION_SUCCESS, SIG_VALIDATION_FAILED} from "account-abstraction/core/Helpers.sol";

/// @title InkSecPaymaster
/// @notice ERC-4337 Validating Paymaster that refuses to sponsor gas for UserOperations
///         targeting blacklisted (malicious) addresses.
/// @dev The `callData` field of a PackedUserOperation encodes the call to the smart
///      account's execute function: execute(address to, uint256 value, bytes calldata data).
///      We decode the first address argument (skipping the 4-byte selector) to extract
///      the destination address and check it against the blacklist.
contract InkSecPaymaster is BasePaymaster {

    // ── Storage ──────────────────────────────────────────────────────

    /// @notice Addresses that are blocked from receiving sponsored gas.
    mapping(address => bool) public blacklist;

    // ── Events ───────────────────────────────────────────────────────

    event AddedToBlacklist(address indexed target);
    event RemovedFromBlacklist(address indexed target);

    // ── Errors ───────────────────────────────────────────────────────

    error InkSecPaymaster__BlacklistedTarget(address target);
    error InkSecPaymaster__ZeroAddress();

    // ── Calldata layout constants ─────────────────────────────────────
    // Standard execute(address,uint256,bytes) selector = 4 bytes
    // First param (address `to`) starts at offset 4, occupies 32 bytes (right-padded)
    uint256 private constant SELECTOR_SIZE  = 4;
    uint256 private constant ADDRESS_OFFSET = SELECTOR_SIZE;          // byte 4
    uint256 private constant MIN_CALLDATA   = SELECTOR_SIZE + 32;     // 36 bytes minimum

    // ── Constructor ───────────────────────────────────────────────────

    constructor(IEntryPoint _entryPoint) BasePaymaster(_entryPoint) {}

    // ── Owner: blacklist management ───────────────────────────────────

    /// @notice Add `target` to the blacklist. Future UserOps to this address will be rejected.
    function addToBlacklist(address target) external onlyOwner {
        if (target == address(0)) revert InkSecPaymaster__ZeroAddress();
        // CEI: effect before any external call (none here, but follow pattern)
        blacklist[target] = true;
        emit AddedToBlacklist(target);
    }

    /// @notice Remove `target` from the blacklist.
    function removeFromBlacklist(address target) external onlyOwner {
        // CEI: effect before event
        blacklist[target] = false;
        emit RemovedFromBlacklist(target);
    }

    /// @notice Returns true if `target` is currently blacklisted.
    function isBlacklisted(address target) external view returns (bool) {
        return blacklist[target];
    }

    // ── Internal: ERC-4337 validation ────────────────────────────────

    /// @inheritdoc BasePaymaster
    /// @dev Decodes the destination address from userOp.callData and rejects the
    ///      operation if it targets a blacklisted contract.
    ///      Returns SIG_VALIDATION_SUCCESS (0) to accept sponsorship.
    function _validatePaymasterUserOp(
        PackedUserOperation calldata userOp,
        bytes32, /* userOpHash — unused */
        uint256  /* maxCost   — unused */
    ) internal view override returns (bytes memory context, uint256 validationData) {
        // Only inspect callData if it is long enough to contain a destination address.
        // Shorter callData (e.g. account deployment with no execute call) is allowed through.
        if (userOp.callData.length >= MIN_CALLDATA) {
            // Decode the first word after the 4-byte selector as an address.
            // This matches the standard execute(address to, uint256 value, bytes data) ABI.
            // Checks
            address destination = address(
                uint160(uint256(bytes32(userOp.callData[ADDRESS_OFFSET : ADDRESS_OFFSET + 32])))
            );

            // Effects: revert if blacklisted (no state to write here — blacklist is read-only in validation)
            if (blacklist[destination]) {
                revert InkSecPaymaster__BlacklistedTarget(destination);
            }
        }

        // No postOp context needed — return empty bytes and success.
        return (new bytes(0), SIG_VALIDATION_SUCCESS);
    }
}
