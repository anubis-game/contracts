// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

// https://sepolia.arbiscan.io/address/0x5ADCF69F6Bf6C71B5c5b539D13fe4Ae58dDf58B3
// https://sepolia.arbiscan.io/address/0x4d6F03784B1eFc277F8B2e47593d1Eb187B1F52A
// https://sepolia.arbiscan.io/address/0x881a5E28330839947f458534cC5e8B98De76d2A8
contract Test {
    event Requested(address indexed ori, address indexed snd, address sig, address pla);

    function request(address sig, address pla) public {
        emit Requested(tx.origin, msg.sender, sig, pla);
    }
}
