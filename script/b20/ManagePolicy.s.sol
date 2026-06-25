// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {IB20} from "base-std/interfaces/IB20.sol";
import {IPolicyRegistry} from "base-std/interfaces/IPolicyRegistry.sol";
import {StdPrecompiles} from "base-std/StdPrecompiles.sol";

contract ManagePolicy is Script {
    function run() external {
        require(block.chainid != 8453, "mainnet broadcast disabled in this script");
        string memory action = vm.envString("B20_ACTION");

        vm.startBroadcast();
        if (_eq(action, "create")) {
            uint64 policyId = StdPrecompiles.POLICY_REGISTRY.createPolicy(
                vm.envAddress("B20_POLICY_ADMIN"),
                IPolicyRegistry.PolicyType(vm.envUint("B20_POLICY_TYPE"))
            );
            console.log("policy created:", policyId);
        } else if (_eq(action, "attach")) {
            uint64 policyId = uint64(vm.envUint("B20_POLICY_ID"));
            require(StdPrecompiles.POLICY_REGISTRY.policyExists(policyId), "policy does not exist");
            IB20(vm.envAddress("TOKEN_ADDRESS")).updatePolicy(vm.envBytes32("B20_POLICY_SCOPE"), policyId);
            console.log("policy attached");
        } else if (_eq(action, "stageAdmin")) {
            StdPrecompiles.POLICY_REGISTRY.stageUpdateAdmin(
                uint64(vm.envUint("B20_POLICY_ID")),
                vm.envAddress("B20_PENDING_ADMIN")
            );
            console.log("policy admin staged");
        } else if (_eq(action, "finalizeAdmin")) {
            StdPrecompiles.POLICY_REGISTRY.finalizeUpdateAdmin(uint64(vm.envUint("B20_POLICY_ID")));
            console.log("policy admin finalized");
        } else {
            revert("unsupported B20_ACTION");
        }
        vm.stopBroadcast();
    }

    function _eq(string memory left, string memory right) private pure returns (bool) {
        return keccak256(bytes(left)) == keccak256(bytes(right));
    }
}
