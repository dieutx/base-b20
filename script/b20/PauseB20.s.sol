// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {IB20} from "base-std/interfaces/IB20.sol";

contract PauseB20 is Script {
    function run() external {
        require(block.chainid != 8453, "mainnet broadcast disabled in this script");
        IB20 token = IB20(vm.envAddress("TOKEN_ADDRESS"));
        IB20.PausableFeature[] memory features = new IB20.PausableFeature[](1);
        features[0] = IB20.PausableFeature(vm.envUint("B20_FEATURE"));
        string memory action = vm.envString("B20_ACTION");

        vm.startBroadcast();
        if (_eq(action, "pause")) {
            token.pause(features);
            console.log("feature paused");
        } else if (_eq(action, "unpause")) {
            token.unpause(features);
            console.log("feature unpaused");
        } else {
            revert("B20_ACTION must be pause or unpause");
        }
        vm.stopBroadcast();
    }

    function _eq(string memory left, string memory right) private pure returns (bool) {
        return keccak256(bytes(left)) == keccak256(bytes(right));
    }
}
