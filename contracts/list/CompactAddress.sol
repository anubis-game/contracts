// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

library CompactAddress {
    struct List {
        address[] _add;
        mapping(address => uint256) _ind;
    }

    function create(List storage lis, address add) internal {
        require(add != address(0), "address must not be zero address");
        require(lis._ind[add] == 0, "address already exists");

        lis._add.push(add);
        lis._ind[add] = lis._add.length;
    }

    function exists(
        List storage lis,
        address add
    ) internal view returns (bool) {
        return lis._ind[add] != 0;
    }

    function length(List storage lis) internal view returns (uint256) {
        return lis._add.length;
    }

    function remove(List storage lis, address add) internal {
        require(lis._ind[add] != 0, "address does not exist");

        uint256 ind = lis._ind[add] - 1;
        uint256 lnd = lis._add.length - 1;

        if (ind != lnd) {
            address las = lis._add[lnd];
            lis._add[ind] = las;
            lis._ind[las] = ind + 1;
        }

        lis._add.pop();
        delete lis._ind[add];
    }

    function search(
        List storage lis,
        uint256 ind
    ) internal view returns (address) {
        return lis._add[ind];
    }
}
