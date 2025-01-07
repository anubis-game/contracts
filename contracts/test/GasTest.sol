// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract GasTest {
    mapping(address => address) private _map;

    function AllocateDelete() external {
        _map[address(1)] = address(2);
    }

    function AllocateZero() external {
        _map[address(1)] = address(2);
    }

    function Delete() external {
        delete _map[address(1)];
    }

    function Zero() external {
        _map[address(1)] = address(0);
    }
}
