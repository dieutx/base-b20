// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {B20FactoryLib} from "base-std/lib/B20FactoryLib.sol";

contract B20ConfigReferenceTest is Test {
    function testEncodeAssetParams() public pure {
        bytes memory params = B20FactoryLib.encodeAssetCreateParams("DieuTX B20", "DIEUTX", address(0x1), 18);
        assertGt(params.length, 0);
    }

    function testEncodeStablecoinParams() public pure {
        bytes memory params = B20FactoryLib.encodeStablecoinCreateParams("DieuTX USD", "DUSD", address(0x1), "USD");
        assertGt(params.length, 0);
    }
}
