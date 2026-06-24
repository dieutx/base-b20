// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";

import {B20Constants} from "base-std/lib/B20Constants.sol";
import {B20FactoryLib} from "base-std/lib/B20FactoryLib.sol";
import {IB20Factory} from "base-std/interfaces/IB20Factory.sol";
import {StdPrecompiles} from "base-std/StdPrecompiles.sol";

contract CreateToken is Script {
    function run() external returns (address token) {
        address account = vm.envAddress("ACCOUNT_ADDRESS");
        string memory tokenName = vm.envOr("TOKEN_NAME", string("DieuTX B20"));
        string memory tokenSymbol = vm.envOr("TOKEN_SYMBOL", string("DIEUTX"));
        uint256 decimalsValue = vm.envOr("TOKEN_DECIMALS", uint256(18));
        require(decimalsValue >= 6 && decimalsValue <= 18, "TOKEN_DECIMALS must be 6..18");

        uint8 decimals = uint8(decimalsValue);
        uint256 defaultSupplyCap = 1_000_000 * (10 ** uint256(decimals));
        uint256 supplyCap = vm.envOr("SUPPLY_CAP", defaultSupplyCap);
        bytes32 salt = keccak256(bytes(vm.envOr("TOKEN_SALT", string("dieutx-b20-v1"))));

        bytes memory params = B20FactoryLib.encodeAssetCreateParams(tokenName, tokenSymbol, account, decimals);

        bytes[] memory initCalls = new bytes[](2);
        initCalls[0] = B20FactoryLib.encodeGrantRole(B20Constants.MINT_ROLE, account);
        initCalls[1] = B20FactoryLib.encodeUpdateSupplyCap(supplyCap);

        vm.startBroadcast();
        token = StdPrecompiles.B20_FACTORY.createB20(IB20Factory.B20Variant.ASSET, salt, params, initCalls);
        vm.stopBroadcast();

        console.log("B20 token created at:", token);
    }
}
