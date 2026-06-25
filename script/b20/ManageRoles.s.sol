// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {IB20} from "base-std/interfaces/IB20.sol";

contract ManageRoles is Script {
    function run() external {
        require(block.chainid != 8453, "mainnet broadcast disabled in this script");
        IB20 token = IB20(vm.envAddress("TOKEN_ADDRESS"));
        bytes32 role = vm.envBytes32("B20_ROLE");
        address account = vm.envAddress("B20_ROLE_ACCOUNT");
        string memory action = vm.envString("B20_ACTION");

        vm.startBroadcast();
        if (_eq(action, "grant")) {
            token.grantRole(role, account);
            console.log("role granted");
        } else if (_eq(action, "revoke")) {
            token.revokeRole(role, account);
            console.log("role revoked");
        } else {
            revert("B20_ACTION must be grant or revoke");
        }
        vm.stopBroadcast();
    }

    function _eq(string memory left, string memory right) private pure returns (bool) {
        return keccak256(bytes(left)) == keccak256(bytes(right));
    }
}
