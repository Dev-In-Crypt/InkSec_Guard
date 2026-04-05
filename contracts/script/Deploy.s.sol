// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {IEntryPoint} from "account-abstraction/interfaces/IEntryPoint.sol";

import {MockERC20}        from "../src/MockERC20.sol";
import {DrainerMock}      from "../src/DrainerMock.sol";
import {InkSecPaymaster}  from "../src/InkSecPaymaster.sol";

/// @title Deploy
/// @notice Deploys MockERC20, DrainerMock, and InkSecPaymaster to Ink Sepolia.
///         Blacklists the DrainerMock in the Paymaster and mints tUSDC to a test wallet.
///
/// Required env vars (copy .env.example → .env and fill in):
///   DEPLOYER_PRIVATE_KEY  — deployer's private key (hex, no 0x prefix)
///   TEST_WALLET           — address that receives the initial tUSDC mint
///
/// Run:
///   forge script script/Deploy.s.sol \
///     --rpc-url $INK_SEPOLIA_RPC \
///     --broadcast \
///     --verify \
///     --verifier blockscout \
///     --verifier-url https://explorer-sepolia.inkonchain.com/api/
contract Deploy is Script {

    // ERC-4337 v0.7 EntryPoint — deterministic address on every EVM chain
    address constant ENTRY_POINT = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;

    // Initial tUSDC mint: 10,000 tokens (6 decimals)
    uint256 constant MINT_AMOUNT = 10_000 * 1e6;

    function run() external {
        uint256 deployerKey  = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer     = vm.addr(deployerKey);
        address testWallet   = vm.envAddress("TEST_WALLET");

        console.log("=== InkSec Guard - Deploy ===");
        console.log("Deployer  :", deployer);
        console.log("TestWallet:", testWallet);
        console.log("EntryPoint:", ENTRY_POINT);
        console.log("Chain ID  :", block.chainid);
        console.log("");

        vm.startBroadcast(deployerKey);

        // 1. MockERC20 (tUSDC)
        MockERC20 token = new MockERC20();
        console.log("MockERC20 deployed       :", address(token));

        // 2. DrainerMock
        DrainerMock drainer = new DrainerMock(deployer);
        console.log("DrainerMock deployed     :", address(drainer));

        // 3. InkSecPaymaster
        InkSecPaymaster paymaster = new InkSecPaymaster(
            IEntryPoint(ENTRY_POINT)
        );
        console.log("InkSecPaymaster deployed :", address(paymaster));

        // 4. Blacklist the DrainerMock in the Paymaster
        paymaster.addToBlacklist(address(drainer));
        console.log("DrainerMock blacklisted  : yes");

        // 5. Mint initial tUSDC to the test wallet
        token.mint(testWallet, MINT_AMOUNT);
        console.log("Minted tUSDC to          :", testWallet);

        vm.stopBroadcast();

        // 6. Write deployment addresses to JSON
        _saveAddresses(
            address(token),
            address(drainer),
            address(paymaster),
            deployer
        );
    }

    function _saveAddresses(
        address token,
        address drainer,
        address paymaster,
        address deployer
    ) internal {
        string memory obj = "deployment";

        vm.serializeUint(obj,    "chainId",         block.chainid);
        vm.serializeAddress(obj, "deployer",        deployer);
        vm.serializeAddress(obj, "entryPoint",      ENTRY_POINT);
        vm.serializeAddress(obj, "mockERC20",       token);
        vm.serializeAddress(obj, "drainerMock",     drainer);
        string memory json = vm.serializeAddress(obj, "inkSecPaymaster", paymaster);

        string memory path = string.concat(
            vm.projectRoot(),
            "/deployments/ink-sepolia.json"
        );
        vm.writeJson(json, path);
        console.log("");
        console.log("Addresses saved to deployments/ink-sepolia.json");
    }
}
