// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {IB20} from "base-std/interfaces/IB20.sol";

contract InspectB20 is Script {
    function run() external view {
        IB20 token = IB20(vm.envAddress("TOKEN_ADDRESS"));
        console.log("name:", token.name());
        console.log("symbol:", token.symbol());
        console.log("decimals:", token.decimals());
        console.log("totalSupply:", token.totalSupply());
        console.log("supplyCap:", token.supplyCap());
        console.log("contractURI:", token.contractURI());
    }
}
