// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";

import {B20Constants} from "base-std/lib/B20Constants.sol";
import {B20FactoryLib} from "base-std/lib/B20FactoryLib.sol";
import {IB20Factory} from "base-std/interfaces/IB20Factory.sol";
import {StdPrecompiles} from "base-std/StdPrecompiles.sol";

contract DeployB20 is Script {
    function run() external returns (address token) {
        require(block.chainid != 8453, "mainnet broadcast disabled; use b20:plan:mainnet");

        address admin = vm.envAddress("B20_ADMIN");
        address minter = vm.envAddress("B20_MINTER");
        address burner = vm.envAddress("B20_BURNER");
        address burnBlocked = vm.envAddress("B20_BURN_BLOCKED");
        address pauser = vm.envAddress("B20_PAUSER");
        address unpauser = vm.envAddress("B20_UNPAUSER");
        address metadata = vm.envAddress("B20_METADATA");
        address operator = vm.envOr("B20_OPERATOR", address(0));

        string memory variantName = vm.envOr("B20_VARIANT", string("asset"));
        string memory name = vm.envString("B20_NAME");
        string memory symbol = vm.envString("B20_SYMBOL");
        string memory saltInput = vm.envString("B20_SALT");
        uint256 supplyCap = vm.envUint("B20_SUPPLY_CAP_RAW");
        string memory contractURI = vm.envString("B20_CONTRACT_URI");
        bytes32 salt = keccak256(bytes(saltInput));
        address deployer = vm.envAddress("ACCOUNT_ADDRESS");

        bool stablecoin = _eq(variantName, "stablecoin");
        IB20Factory.B20Variant variant = stablecoin ? IB20Factory.B20Variant.STABLECOIN : IB20Factory.B20Variant.ASSET;
        bytes memory params;
        bytes[] memory roleCalls;
        if (stablecoin) {
            params = B20FactoryLib.encodeStablecoinCreateParams(name, symbol, admin, vm.envString("B20_CURRENCY"));
            roleCalls = B20FactoryLib.buildRoleGrants(
                B20FactoryLib.B20RoleHolders({
                    minter: minter,
                    burner: burner,
                    burnBlocker: burnBlocked,
                    pauser: pauser,
                    unpauser: unpauser,
                    metadataAdmin: metadata
                })
            );
        } else {
            uint256 decimalsValue = vm.envOr("B20_DECIMALS", uint256(18));
            require(decimalsValue >= 6 && decimalsValue <= 18, "B20_DECIMALS must be 6..18");
            params = B20FactoryLib.encodeAssetCreateParams(name, symbol, admin, uint8(decimalsValue));
            roleCalls = B20FactoryLib.buildRoleGrants(
                B20FactoryLib.B20AssetRoleHolders({
                    minter: minter,
                    burner: burner,
                    burnBlocker: burnBlocked,
                    pauser: pauser,
                    unpauser: unpauser,
                    metadataAdmin: metadata,
                    operator: operator
                })
            );
        }

        bytes[] memory configCalls = new bytes[](2);
        configCalls[0] = B20FactoryLib.encodeUpdateSupplyCap(supplyCap);
        configCalls[1] = B20FactoryLib.encodeUpdateContractURI(contractURI);
        bytes[] memory initCalls = B20FactoryLib.concat(roleCalls, configCalls);
        address predicted = StdPrecompiles.B20_FACTORY.getB20Address(variant, deployer, salt);
        require(!StdPrecompiles.B20_FACTORY.isB20Initialized(predicted), "B20 token already initialized");

        vm.startBroadcast();
        token = StdPrecompiles.B20_FACTORY.createB20(variant, salt, params, initCalls);
        vm.stopBroadcast();

        console.log("B20 token created at:", token);
    }

    function _eq(string memory left, string memory right) private pure returns (bool) {
        return keccak256(bytes(left)) == keccak256(bytes(right));
    }
}
