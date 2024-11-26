// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {AccessControlEnumerable} from "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IToken} from "./interface/IToken.sol";

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract Registry is AccessControlEnumerable {
    //
    // ERRORS
    //

    // Address is used to revert if any onchain identity was found to be invalid
    // for its intended purpose, e.g. the given token is not an ERC20.
    error Address(string why);
    // Balance is used to revert if any token balance related issues are
    // detected, e.g. the required minimum balance is not being met.
    error Balance(string why, uint256 bal);
    // Process is used to revert if any logical mechanism was found to be
    // prohibited, e.g. a user reports on a resolved kill state.
    error Process(string why);

    //
    // EVENTS
    //

    // Witness is emitted when a player reports some kill state that they
    // themselves witnessed. Witness reports help to increase the platform's
    // credible neutrality because players can prove to players that they all
    // see the same game state from their own point of view.
    //
    //     wit is the address of the player reporting this kill state
    //     grd is the address of the guardian resolving this kill state
    //     gam is the ID of the game for which this game state is reported
    //     kil is the ID of the kill state itself being reported
    //     win is the address of the winning player being reported
    //     los is the address of the losing player being reported
    //
    event Witness(address indexed wit, address indexed grd, uint256 indexed gam, uint256 kil, address win, address los);
    // Guardian is emitted when a guardian resolves some kill state. When this
    // event is emitted, then all relevant player balances have been updated.
    //
    //     grd is the address of the guardian resolving this kill state
    //     gam is the ID of the game for which this game state is resolved
    //     kil is the ID of the kill state itself being resolved
    //     win is the address of the winning player being resolved
    //     los is the address of the losing player being resolved
    //     avl is the amount of tokens won by the winning player
    //     bin is the amount of tokens lost by the losing player
    //
    event Guardian(
        address indexed grd, uint256 indexed gam, uint256 kil, address win, address los, uint256 avl, uint256 bin
    );

    //
    // MAPPINGS
    //

    // _allocBalance contains the allocated balance every player has in this
    // smart contract. Allocated balances may increase by entering games. The
    // allocated balance is the part of the player balance that cannot be
    // withdrawn until the allocated game state is resolved.
    mapping(bytes32 => uint256) private _allocBalance;
    // _availBalance contains the available balance every player has in this
    // smart contract. Available balances may increase if players kill other
    // players. The available balance is the part of the player balance that can
    // be withdrawn any time.
    mapping(address => uint256) private _availBalance;
    // _historicGain tracks the historical net balances gained by winning games.
    // This counter increases if players win and decreases if players lose. The
    // "best" player will have the highest historic gain, because that player
    // lost less and won more than any other player on a net basis. This
    // historic gain may help us to differentiate between different leagues of
    // players. Inexperienced players may not play with elite players so that we
    // can replicate settings comparable to poker tables with varying blind
    // sizes.
    mapping(address => uint256) private _historicGain;
    //
    mapping(bytes32 => bytes32) private _guardianResolve;
    //
    mapping(address => uint256) private _playerGame;
    //
    mapping(bytes32 => bytes32) private _witnessReport;

    //
    // CONSTANTS
    //

    // BASIS_FEE is the deducated amount of allocation in basis points, from
    // which fees have been subtracted already. This number is the basis for our
    // internal accounting when distributing allocated tokens during game
    // resolution.
    uint16 public constant BASIS_FEE = 8_000;
    // BASIS_GUARDIAN is the amount of guardian fees in basis points, which are
    // deducted from the losing players. This is the amount that guardians may
    // earn by resolving games.
    uint16 public constant BASIS_GUARDIAN = 1_000;
    // BASIS_PROTOCOL is the amount of protocol fees in basis points. This
    // constant is not used anywhere, but only represented here for completeness
    // and documentation. The process of updating user balances distributes
    // funds to everyone who is owed their fair share as implemented by this
    // smart contract. The remainder is then given to the protocol owner, which
    // is also how we account for precision loss.
    uint16 public constant BASIS_PROTOCOL = 1_000;
    // BASIS_SPLIT is the amount in basis points that splits loser allocations,
    // so that we can distribute towards the winners allocated and available
    // balances. 5000 means 50%. So if you kill me, then half of my allocation
    // goes towards your allocation, and the other half goes towards your
    // available balance.
    uint16 public constant BASIS_SPLIT = 5_000;
    // BASIS_TOTAL is the total amount of basis points in 100%. This amount is
    // used to calculate fees and their remainders.
    uint16 public constant BASIS_TOTAL = 10_000;

    //
    // VARIABLES
    //

    // buyin is the amount of tokens required that every player has to allocate
    // in order to enter a game.
    uint256 public immutable buyin;
    // owner is the owner address of the privileged entity receiving protocol
    // fees.
    address public owner;
    // token is the token address for this instance of the deployed contract.
    // That means every deployed contract is only responsible for serving games
    // denominated in any given token address.
    address public immutable token;

    //
    // BUILTIN
    //

    // constructor initializes an instance of the Registry contract by setting
    // the provided token address, which is immutable, meaning any Registry
    // instance will only ever use a single token. Multiple Registry instances
    // may be deployed to support multiple tokens across the platform.
    constructor(address own, address tok) {
        if (own == address(0)) {
            revert Address("owner invalid");
        }

        if (tok == address(0)) {
            revert Address("token invalid");
        }

        // There is no real way to ensure that the given token contract is in
        // fact an ERC20. We are simply trying to call some function provided
        // with that interface and assume we have a real ERC20. This check
        // guards at least against EOAs, so that it is not possible anymore to
        // confuse the owner address with the token address.
        {
            IToken(tok).totalSupply();
        }

        // Additionally to the above, we want to ensure that Guardian contracts
        // cannot be deployed for tokens that do not provide at least 6 decimals
        // for their internal accounting. For instance, USDC has exactly 6
        // decimals defined, and is therefore a valid token to be used.
        uint8 dec;
        {
            dec = IToken(tok).decimals();
            if (dec < 6) {
                revert Balance("decimals invalid", dec);
            }
        }

        {
            _grantRole(DEFAULT_ADMIN_ROLE, own);
        }

        {
            buyin = 10 ** dec;
            owner = own;
            token = tok;
        }
    }

    function enterGame(uint256 gam) public {
        // Ensure that valid game IDs must be provided. The zero value of an
        // integer is not allowed.
        if (gam == 0) {
            revert Process("game zero");
        }

        // use is the caller's address which is attempting to enter the provided
        // game.
        address use = msg.sender;
        // Create the balance key. This key points to the player's allocated and
        // available balances for the provided game.
        bytes32 key = balHash(use, gam);

        // Account for the balance required in order to enter a new game. We try
        // to prevent token transfers if the available user balance is
        // sufficient. Any tokens missing will be requested from the configured
        // token contract. The caller then needs to provide an allowance that is
        // able to cover the difference transferred.
        uint256 avl = _availBalance[use];
        if (avl >= buyin) {
            _availBalance[use] -= buyin;
        } else {
            if (avl > 0) {
                {
                    _availBalance[use] = 0;
                }

                if (!IERC20(token).transferFrom(use, address(this), (buyin - avl))) {
                    revert Balance("transfer failed", (buyin - avl));
                }
            } else {
                if (!IERC20(token).transferFrom(use, address(this), buyin)) {
                    revert Balance("transfer failed", buyin);
                }
            }
        }

        // Ensure that every player can only enter one game at a time.
        if (_playerGame[use] != 0) {
            revert Process("already entered");
        }

        {
            _playerGame[use] = gam;
        }

        // Ensure that every player can only enter the same game once at a time.
        if (_allocBalance[key] != 0) {
            revert Process("already entered");
        }

        // Track the player's allocated balance so we can tell people where they
        // stand any time. The allocated balances are all funds that are
        // currently bound in active games. The player's available balance does
        // not change here because the player is directly depositing into a game
        // when entering. The player's available balances may only increase
        // later, if, and only if a player is rewarded upon killing another
        // player.
        {
            _allocBalance[key] = buyin;
        }
    }

    // withdraw allows anyone to withdraw their own available balance any time
    // as distributed by this smart contract.
    function withdraw(uint256 bal) public {
        // use is the caller's address which is attempting to withdraw the
        // provided amount of available tokens.
        address use = msg.sender;

        // The arithmetic below is intentionally defined outside of an
        // "unchecked" block, so that anyone trying to withdraw more than they
        // are owed causes their own transaction to revert with a panic.
        {
            _availBalance[use] -= bal;
        }

        if (!IERC20(token).transfer(use, bal)) {
            revert Balance("transfer failed", bal);
        }
    }

    // witnessReport allows any user to report kill state for any game exactly
    // once.
    //
    //     inp[0] the guardian address facilitating this game
    //     inp[1] the ID of the game being played
    //     inp[2] the ID of the kill state being reported
    //     inp[3] the address of the winner being reported
    //     inp[4] the address of the loser being reported
    //
    function witnessReport(address grd, uint256 gam, uint256 kil, address win, address los) public {
        // Create the witness key. This key tells us what the user reported.
        bytes32 witKey = keyHash(msg.sender, gam, kil);
        // Create the kill value. This value tells us who won and who lost.
        bytes32 kilVal = valHash(win, los);

        // Ensure that every witness can only report once.
        if (_witnessReport[witKey] != bytes32(0)) {
            revert Process("already reported");
        }

        // Track the kill state based on the data that the witness reported.
        {
            _witnessReport[witKey] = kilVal;
        }

        // Emit an event for the witness report. This allows us to filter for
        // events reported by a particular witness for a particular guardian.
        {
            emit Witness(msg.sender, grd, gam, kil, win, los);
        }
    }

    function guardianResolve(uint256 gam, uint64 kil, address win, address los) public {
        // Create the guardian key. This key tells us what the guardian
        // reported.
        bytes32 grdKey = keyHash(msg.sender, gam, kil);
        // Create the kill value. This value tells us who won and who lost.
        bytes32 kilVal = valHash(win, los);
        // Create the loser key. This key points to the loser's allocated
        // balance for the provided game.
        bytes32 losKey = balHash(los, gam);
        // Create the winner key. This key points to the winner's allocated and
        // available balances for the provided game.
        bytes32 winKey = balHash(win, gam);

        // Ensure that every guardian can only resolve once.
        if (_guardianResolve[grdKey] != bytes32(0)) {
            revert Process("already resolved");
        }

        // Track the kill state based on the data that the guardian resolved.
        {
            _guardianResolve[grdKey] = kilVal;
        }

        uint256 fee;
        uint256 grd;
        uint256 own;
        uint256 alo;
        uint256 avl;

        // In case the losing player got killed by a bot, then there is no
        // allocated balance to win. That also means there is no balance to lose
        // other than the guardian and protocol fees used to cover operational
        // expenses. So in case any player got defeated by a bot we simply free
        // all allocated resources in order for the defeated player to start
        // over again.
        if (win == address(0)) {
            grd = (_allocBalance[losKey] * BASIS_GUARDIAN) / BASIS_TOTAL;
            own = (_allocBalance[losKey] * BASIS_GUARDIAN) / BASIS_TOTAL;
            avl = _allocBalance[losKey] - (grd + own);

            _allocBalance[losKey] = 0;
            _availBalance[los] += avl;
            _playerGame[los] = 0;
            _availBalance[msg.sender] += grd;
            _availBalance[owner] += own;

            return;
        }

        unchecked {
            // fee is the amount of tokens distributed to the winner.
            fee = (_allocBalance[losKey] * BASIS_FEE) / BASIS_TOTAL;
            // grd is the amount of tokens distributed to the guardian.
            grd = (_allocBalance[losKey] * BASIS_GUARDIAN) / BASIS_TOTAL;
            // own is the amount of tokens distributed to the protocol.
            own = _allocBalance[losKey] - (fee + grd);
            // alo is the amount of tokens distributed to the winner's allocated
            // balance.
            alo = (fee * BASIS_SPLIT) / BASIS_TOTAL;
            // avl is the amount of tokens distributed to the winner's available
            // balance.
            avl = (fee - alo);
        }

        unchecked {
            // Move half of the allocated loser balance to the allocated winner
            // balance. This makes the game allocation of the winning player
            // bigger. If this winning player is going to be defeated by another
            // player eventually, then this new winning player wins a bigger
            // allocation.
            _allocBalance[winKey] += alo;
            // Move half of the allocated loser balance to the available winner
            // balance. This secures some of the winnings so that winners may
            // recoup their entry allocation and eventually get away with
            // profits.
            _availBalance[win] += avl;
            // Add the increase in available balance to the historical net gain
            // of the winner player. The amount of tokens added here is the
            // cumulative value that winning players earn over time.
            _historicGain[win] += avl;
            // Remove the buyin amount from the historical net gain of the
            // losing player. This reduces the historical performance of losing
            // players up to zero.
            if (_historicGain[los] < buyin) {
                _historicGain[los] = 0;
            } else {
                _historicGain[los] -= buyin;
            }
            // Take all allocated balance away from the losing player. That
            // enables the losing player to enter the same game again, if they
            // wish to.
            _allocBalance[losKey] = 0;
            // Remove the game ID from the mapping of the losing player. That
            // enables the losing player to enter any game again, if they wish
            // to.
            _playerGame[los] = 0;
            // Make the guardian fees available for the guardian address
            // resolving this game state.
            _availBalance[msg.sender] += grd;
            // Make the protocol fees available for the protocol owner. The
            // amount that the protocol earns is the rest of the loser's
            // allocation, after deducting the winner's allocation and the
            // guardian fees. This rest amount includes any eventual precision
            // loss.
            _availBalance[owner] += own;
        }

        // Emit an event for the guardian resolution. This allows us to filter
        // for events resolved by a particular guardian.
        {
            emit Guardian(msg.sender, gam, kil, win, los, avl, buyin);
        }
    }

    function balHash(address add, uint256 gam) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(add, gam));
    }

    function keyHash(address add, uint256 gam, uint256 kil) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(add, gam, kil));
    }

    function valHash(address win, address los) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(win, los));
    }

    // searchBalance allows anyone to search for the allocated, available and
    // historic balances of any player. The allocated user balance represents
    // all funds currently bound to a game being played. Those funds are locked
    // until the respective game resolution distributes them accordingly.
    // Allocated balances grow by entering games and killing other players
    // within those games. The available user balance represents all funds
    // distributed to players who have won against other players upon kill state
    // resolution. Those available funds may be withdrawn any time. The
    // historical balances provide an insight into a players performance over
    // time. The assumption is that the higher a player's historical net gain
    // is, the better of a player they are.
    //
    //     out[0] the allocated user balance
    //     out[1] the available user balance
    //     out[2] the historic net gain
    //
    function searchBalance(address use) public view returns (uint256, uint256, uint256) {
        return (_allocBalance[balHash(use, _playerGame[use])], _availBalance[use], _historicGain[use]);
    }
}
