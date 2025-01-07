// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {CompactAddress} from "../list/CompactAddress.sol";

contract CompactAddressTest {
    using CompactAddress for CompactAddress.List;

    CompactAddress.List private _lis;

    function create(address add) external {
        _lis.create(add);
    }

    function exists(address add) external view returns (bool) {
        return _lis.exists(add);
    }

    function length() external view returns (uint256) {
        return _lis.length();
    }

    function remove(address add) external {
        _lis.remove(add);
    }

    function search(uint256 ind) external view returns (address) {
        return _lis.search(ind);
    }
}
