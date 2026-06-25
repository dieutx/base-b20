// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";

contract SmokeB20 is Script {
    function run() external view {
        require(block.chainid == 84532, "Sepolia smoke test only");
        console.log("Sepolia smoke scaffold ready. Use DeployB20, MintBurnB20, ManagePolicy, and PauseB20 in guarded steps.");
    }
}
