// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {IB20} from "base-std/interfaces/IB20.sol";

contract MintBurnB20 is Script {
    function run() external {
        require(block.chainid != 8453, "mainnet broadcast disabled in this script");
        IB20 token = IB20(vm.envAddress("TOKEN_ADDRESS"));
        string memory action = vm.envString("B20_ACTION");
        bytes32 memo = vm.envOr("B20_MEMO", bytes32(0));

        vm.startBroadcast();
        if (_eq(action, "mint")) {
            token.mintWithMemo(vm.envAddress("B20_TO"), vm.envUint("B20_AMOUNT_RAW"), memo);
            console.log("mintWithMemo broadcast");
        } else if (_eq(action, "burn")) {
            token.burnWithMemo(vm.envUint("B20_AMOUNT_RAW"), memo);
            console.log("burnWithMemo broadcast");
        } else if (_eq(action, "burnBlocked")) {
            token.burnBlocked(vm.envAddress("B20_FROM"), vm.envUint("B20_AMOUNT_RAW"));
            console.log("burnBlocked broadcast");
        } else {
            revert("B20_ACTION must be mint, burn, or burnBlocked");
        }
        vm.stopBroadcast();
    }

    function _eq(string memory left, string memory right) private pure returns (bool) {
        return keccak256(bytes(left)) == keccak256(bytes(right));
    }
}
