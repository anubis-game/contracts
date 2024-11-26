// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// IToken represents basically anything that manages tokens on behalf of its
// holders, e.g. ERC-20, ERC-721, ERC-1155 etc.
interface IToken {
    function balanceOf(address) external view returns (uint256);
    function decimals() external view returns (uint8);
    function totalSupply() external view returns (uint256);
}
