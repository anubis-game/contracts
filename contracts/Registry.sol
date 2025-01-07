// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IToken} from "./interface/IToken.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract Registry {
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

    // WitnessPublish is emitted when a Player reports an observed kill state
    // that they themselves witnessed based on the game state that the Guardian
    // streamed to them. Report helps to increase the platform's credible
    // neutrality, because every Player may prove to others that they see the
    // same game state from their own point of view like everyone else.
    //
    //     pla is the address of the player reporting this kill state
    //     grd is the address of the guardian resolving this kill state
    //     kil is the ID of the kill state itself being reported
    //     win is the address of the winning player being reported
    //     los is the address of the losing player being reported
    //
    event WitnessPublish(
        address indexed pla,
        address indexed grd,
        uint256 kil,
        address win,
        address los
    );
    // GuardianResolve is emitted when a Guardian resolves some kill state. When
    // this event is emitted, then all relevant Player balances have been
    // updated.
    //
    //     grd is the address of the guardian resolving this kill state
    //     kil is the ID of the kill state itself being resolved
    //     win is the address of the winning player being resolved
    //     los is the address of the losing player being resolved
    //     dep is the amount of tokens won by the winning player
    //     buy is the amount of tokens lost by the losing player
    //
    event GuardianResolve(
        address indexed grd,
        uint256 kil,
        address win,
        address los,
        uint256 dep,
        uint256 buy
    );

    //
    // MAPPINGS
    //

    // _allocatedBalance contains the allocated balance every player has in this
    // smart contract. Allocated balances may increase by entering games. The
    // allocated balance is the part of the player balance that cannot be
    // withdrawn until the allocated game state is resolved.
    mapping(address => uint256) private _allocatedBalance;
    // _depositedBalance contains the deposited balance every player has in this
    // smart contract. Deposited balances may increase if players kill other
    // players. The deposited balance is the part of the player balance that can
    // be withdrawn any time.
    mapping(address => uint256) private _depositedBalance;
    // _historicGain tracks the historical net balances gained by winning games.
    // This counter increases if players win and decreases if players lose. The
    // "best" player will have the highest historic gain, because that player
    // lost less and won more than any other player on a net basis. This
    // historic gain may help us to differentiate between different leagues of
    // players. Inexperienced players may not play with elite players so that we
    // can replicate settings comparable to poker tables with varying blind
    // sizes.
    mapping(address => uint256) private _historicGain;
    // _playerWallet
    mapping(address => address) private _playerWallet;
    // _signerWallet
    mapping(address => address) private _signerWallet;
    // _walletGuardian
    mapping(address => address) private _walletGuardian;
    // _walletSigner
    mapping(address => address) private _walletSigner;
    // _walletTimestamp
    mapping(address => uint256) private _walletTimestamp;
    // _witnessReport
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
    // smart contract. The remainder is then given to the beneficiary address,
    // which is also how we account for precision loss.
    uint16 public constant BASIS_PROTOCOL = 1_000;
    // BASIS_SPLIT is the amount in basis points that splits loser allocations,
    // so that we can distribute towards the winners allocated and deposited
    // balances. 5000 means 50%. So if you kill me, then half of my allocation
    // goes towards your allocation, and the other half goes towards your
    // deposited balance.
    uint16 public constant BASIS_SPLIT = 5_000;
    // BASIS_TOTAL is the total amount of basis points in 100%. This amount is
    // used to calculate fees and their remainders.
    uint16 public constant BASIS_TOTAL = 10_000;
    // KILL_STATE_ESCAPE is the kill state to identify players who had to escape
    // from faulty Guardians.
    uint256 public constant KILL_STATE_ESCAPE = 47;
    // KILL_STATE_RELEASE is the kill state to identify an orderly release of an
    // active player as executed by the associated Guardian.
    uint256 public constant KILL_STATE_RELEASE = 33;
    // VERSION is the code release of https://github.com/anubis-game/contracts.
    string public constant VERSION = "v0.4.0";

    //
    // VARIABLES
    //

    // beneficiary is the address of the privileged entity receiving protocol
    // fees.
    address public beneficiary;
    // buyin is the amount of tokens required that every player has to allocate
    // in order to enter a game.
    uint256 public immutable buyin;
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
    constructor(address ben, address tok, uint256 buy) {
        if (ben == address(0)) {
            revert Address(
                "Owner address invalid. The given beneficiary must not be zero address."
            );
        }

        if (tok == address(0)) {
            revert Address(
                "Token address invalid. The given token must not be zero address."
            );
        }

        // There is no real way to ensure that the given token contract is in
        // fact an ERC20. We are simply trying to call some function provided
        // with that interface and assume we have a real ERC20. This check
        // guards at least against EOAs, so that it is not possible anymore to
        // confuse the beneficiary address with the token address.
        {
            IToken(tok).totalSupply();
        }

        // Additionally to the above, we want to ensure that Guardian contracts
        // cannot be deployed for tokens that do not provide at least 6 decimals
        // for their internal accounting. For instance, USDC has exactly 6
        // decimals defined, and is therefore a valid token to be used.
        {
            uint8 dec = IToken(tok).decimals();
            if (dec < 6) {
                revert Balance(
                    "Token decimals invalid. The given token must have at least 6 decimals.",
                    dec
                );
            }
        }

        {
            beneficiary = ben;
            buyin = buy;
            token = tok;
        }
    }

    //
    //
    // PUBLIC
    //
    //

    // The user's Wallet may sign a transaction once in order to deposit tokens
    // into the Registry by proving ownership over a delegated Signer. An
    // EIP-191 compliant signature must be provided, which has to recover to the
    // provided Signer address. This dedicated contract write for depositing an
    // deposited balance allows the user to control their funds at all times,
    // while further game related functionality is delegated to the Signer. The
    // Signer will later prove that the Wallet, Signer and Player addresses are
    // all controlled by the same entity. The tokens deposited here become the
    // user's deposited balance within the trustless Registry smart contract.
    // The Signer is authorized to request participation in a new game via the
    // Player, which will then allocate the user's deposited balance, but only
    // on behalf of the user's Wallet. Neither the Signer nor the Player will
    // ever be able to withdraw user funds from the Registry.
    function Deposit(
        uint256 bal,
        uint64 tim,
        address sig,
        bytes memory sgn
    ) public {
        // wal is the user's Wallet address which is attempting to deposit the
        // provided amount as deposited balance.
        address wal = msg.sender;

        // Deposit the user's tokens from the user wallet into this smart
        // contract. If this works without reverting, then we can credit the
        // internal user account for the caller's address, and enable the user's
        // preferred delegate for onchain state management.
        if (!IERC20(token).transferFrom(wal, address(this), bal)) {
            revert Balance("Deposit transfer failed.", bal);
        }

        // Map the given Wallet-Signer relationship, if we find it to be valid.
        // Only if this succeeds we can credit the transferred deposited balance
        // to the internal account of the calling Wallet.
        {
            deposit(tim, sig, sgn);
        }

        // Credit the Wallet address with the deposited amount. The deposited
        // balance can only ever be withdrawn by the Wallet itself, never by the
        // Signer nor the Player address.
        {
            _depositedBalance[wal] += bal;
        }
    }

    // Every Guardian is obligated to release every active player after a
    // maximum of 3 hours. After that grace period, every user is free to
    // escape, if their associated Guardian has not yet released the given
    // player. Escaping allows every player to release themselves in case a
    // faulty Guardian keeps players stuck in a game. The assumption made here
    // is that no game activity takes more than 3 hours, meaning, after 3 hours
    // every player should have been killed at least once, effectively releasing
    // said player and resetting their registration timestamp.
    function Escape(address grd) public {
        // pla
        address pla = msg.sender;
        // wal
        address wal = _playerWallet[pla];
        // tim
        uint256 tim = _walletTimestamp[wal];

        // Ensure that the time passed from the point of starting the game is at
        // least 3 hours. If a player calls Escape without participating in any
        // game, then release() below will revert, because of the missing
        // Guardian mapping.
        if (tim + 3 hours > block.timestamp) {
            revert Process(
                "Wallet escape invalid. The associated Wallet must wait 3 hours before escaping."
            );
        }

        release(grd, KILL_STATE_ESCAPE, wal);
    }

    // Releasing a losing player is done by the respective Guardian in case a
    // player got killed by the environment, e.g. bots or obstacles. In such a
    // case there is no winning player, but the losing player has to be resolved
    // anyway. Upon release, the losing player will receive their allocated
    // balance back, minus the relevant Guardian and Protocol fees required to
    // cover operational costs.
    function Release(address los) public {
        release(msg.sender, KILL_STATE_RELEASE, los);
    }

    // The Player signs a transaction to request participation in a new game by
    // providing the desired Guardian address, a threshold timestamp in unix
    // seconds, the associated Wallet address, and an EIP-191 compliant
    // signature generated by the Signer. This contract write will allocated the
    // game specific buy-in amount, which means that the Player is spending the
    // deposited balance of the Wallet, but only to the extend of the buy-in
    // amount required for game participation. The success of this contract
    // write proves onchain that the Wallet controls the Signer, and that the
    // Signer controls the Player, which in turn proves that the Wallet controls
    // the Player too. The assumption can then be made that Wallet, Signer and
    // Player are controlled by the same user. As a result of this contract
    // write, a transaction hash will be produced onchain, which will become an
    // input parameter for establishing an authorized WebSocket connection in
    // the next step.
    function Request(
        address grd,
        uint64 tim,
        address wal,
        bytes memory sgn
    ) public {
        // pla is the user's Player address delegated to manage the onchain game
        // state on behalf of their Wallet.
        address pla = msg.sender;
        // rec is the user's Signer address that generated the provided
        // signature. This address points to the user's Wallet.
        address rec = RecoverSigner(RequestMessage(grd, tim, pla), sgn);

        // Ensure that the given timestamp cannot be too far in the future. This
        // restricts the potential entropy for signature forgery.
        if (tim >= block.timestamp + 60 seconds) {
            revert Process(
                "Unix timestamp invalid. The timestamp must not be more than 60 seconds in the future"
            );
        }

        // Ensure that the given timestamp cannot be in the past. This
        // restricts the potential entropy for signature forgery.
        if (tim <= block.timestamp - 60 seconds) {
            revert Process(
                "Unix timestamp invalid. The timestamp must not be older than 60 seconds."
            );
        }

        // Ensure that the provided Wallet address maps to the recovered Signer
        // address. Only if this check passes, it is safe for the Guardian to
        // use the Wallet address provided during this contract write.
        if (wal != _signerWallet[rec]) {
            revert Address(
                "Wallet mapping invalid. The recovered Signer does not map to the provided Wallet."
            );
        }

        // Ensure that every player can only enter one game at a time. This
        // check also ensures that every player can only enter the same game
        // once at a time, because every Guardian address is only ever
        // responsible for one game.
        if (_walletGuardian[wal] == address(0)) {
            _walletGuardian[wal] = grd;
        } else {
            revert Address(
                "Player reuqest invalid. The delegating Wallet is already playing a game."
            );
        }

        // Account for the balance required in order to enter a new game. We try
        // to prevent token transfers if the deposited balance is sufficient.
        // Any tokens missing will be requested from the configured token
        // contract. The caller then needs to provide an allowance that is able
        // to cover the difference transferred.
        if (_depositedBalance[wal] >= buyin) {
            _depositedBalance[wal] -= buyin;
        } else {
            revert Balance(
                "Deposited balance insufficient. Minimum buyin required.",
                buyin
            );
        }

        // We need to track the relationship between Player and Wallet so that
        // we can infer the actual Wallet address during contract writes made by
        // the Player address. E.g. see Escape() and Publish().
        if (_playerWallet[pla] != wal) {
            _playerWallet[pla] = wal;
        }

        // We track the timstamp of starting the game for every player, so that
        // we can allow anyone who got stuck caused by a faulty Guardian to
        // escape by themselves after a grace period of 3 hours.
        {
            _walletTimestamp[wal] = block.timestamp;
        }

        // Track the user's allocated balance so we can tell people where they
        // stand any time. The allocated balances are all funds that are
        // currently bound in active games. The user's deposited balance does
        // not change here because the user is directly allocating their
        // deposited balance to the provided game when requesting to play. The
        // user's deposited balances may only increase later, if, and only if
        // their Player is rewarded upon killing another Player within the scope
        // of a played game.
        {
            _allocatedBalance[wal] = buyin;
        }
    }

    // Publish allows any witnessing Player to report the kill state for any
    // player pair exactly once, as long as those witnesses participate in the
    // associated games themselves.
    //
    //     inp[0] the ID of the kill state being reported
    //     inp[1] the address of the winning player being reported
    //     inp[2] the address of the losing player being reported
    //
    function Publish(uint256 kil, address win, address los) public {
        // pla
        address pla = msg.sender;
        // wal
        address wal = _playerWallet[pla];
        // grd
        address grd = _walletGuardian[wal];
        // Create the witness key. This key tells us what the user reported.
        bytes32 witKey = keccak256(abi.encodePacked(pla, "-", kil));

        // Ensure that the publishing player is in fact participating in any game.
        if (grd == address(0)) {
            revert Process(
                "Witness report invalid. Witness address is not playing any game."
            );
        }

        // Ensure that the winning Player has in fact requested to be resolved by
        // the provided Guardian address.
        if (_walletGuardian[win] != grd) {
            revert Address(
                "Witness report invalid. Winning address not mapped to Guardian address."
            );
        }

        // Ensure that the losing Player has in fact requested to be resolved by
        // the provided Guardian address.
        if (_walletGuardian[los] != grd) {
            revert Address(
                "Witness report invalid. Losing address not mapped to Guardian address."
            );
        }

        // Track the kill state based on the data that the witness reported, and
        // ensure that every witness can only report once.
        if (_witnessReport[witKey] == bytes32(0)) {
            _witnessReport[witKey] = keccak256(abi.encodePacked(win, "-", los));
        } else {
            revert Process(
                "Witness report invalid. Witness address has already reported."
            );
        }

        // Emit an event for the witness report. This allows us to filter for
        // events reported by a particular witness for a particular guardian.
        {
            emit WitnessPublish(pla, grd, kil, win, los);
        }
    }

    function Resolve(uint256 kil, address win, address los) public {
        // grd
        address grd = msg.sender;

        // Ensure that the winning Player has in fact requested to be resolved
        // by the provided Guardian address.
        if (_walletGuardian[win] != grd) {
            revert Address(
                "Guardian resolve invalid. Winning address not mapped to Guardian address."
            );
        }

        // Ensure that the losing Player has in fact requested to be resolved
        // by the provided Guardian address.
        if (_walletGuardian[los] != grd) {
            revert Address(
                "Guardian resolve invalid. Losing address not mapped to Guardian address."
            );
        }

        {
            resolve(grd, kil, win, los);
        }
    }

    // UpdateBeneficiary allows the current beneficiary to update itself. The
    // new address "ben" must not be the zero address, and it must not be the
    // current beneficiary.
    function UpdateBeneficiary(address ben) public {
        if (msg.sender != beneficiary) {
            revert Address(
                "Contract write unauthorized. The sender address must be the current beneficiary."
            );
        }

        if (ben == address(0)) {
            revert Address(
                "Beneficiary address invalid. The given address must not be zero."
            );
        }

        if (ben == beneficiary) {
            revert Address(
                "Beneficiary address invalid. The given address is already the beneficiary."
            );
        }

        {
            beneficiary = ben;
        }
    }

    // Withdraw allows anyone to withdraw their own deposited balance any time
    // as distributed by this smart contract.
    function Withdraw(uint256 bal) public {
        // use is the caller's address which is attempting to withdraw the
        // provided amount of deposited tokens.
        address use = msg.sender;

        // The arithmetic below is intentionally defined outside of an
        // "unchecked" block, so that anyone trying to withdraw more than they
        // are owed causes their own transaction to revert with a panic.
        {
            _depositedBalance[use] -= bal;
        }

        if (!IERC20(token).transfer(use, bal)) {
            revert Balance("transfer failed", bal);
        }
    }

    //
    //
    // PUBLIC VIEW
    //
    //

    // SearchBalance allows anyone to search for the allocated, deposited and
    // historic balances of any player. The allocated user balance represents
    // all funds currently bound to a game being played. Those funds are locked
    // until the respective game resolution distributes them accordingly.
    // Allocated balances grow by entering games and killing other players
    // within those games. The deposited user balance represents all funds
    // distributed to players who have won against other players upon kill state
    // resolution. Those deposited funds may be withdrawn any time. The
    // historical balances provide an insight into a players performance over
    // time. The assumption is that the higher a player's historical net gain
    // is, the better of a player they are.
    //
    //     out[0] the allocated user balance
    //     out[1] the deposited user balance
    //     out[2] the historic net gain
    //
    function SearchBalance(
        address wal
    ) public view returns (uint256, uint256, uint256) {
        return (
            _allocatedBalance[wal],
            _depositedBalance[wal],
            _historicGain[wal]
        );
    }

    // SearchSigner allows anyone to verify the Signer mapping for the given
    // address. If our internal delegation process is intact, then the first
    // address returned here is the provided Wallet address itself, and the
    // second address is the respective delegated Signer address. If a Wallet
    // has an active delegated Signer, and if the two aforementioned assumptions
    // turn out to be false, then the internal delegation process is broken and
    // this smart contract may be considered exploitable.
    function SearchSigner(address wal) public view returns (address, address) {
        address sig = _walletSigner[wal];
        address cur = _signerWallet[sig];

        return (cur, sig);
    }

    //
    //
    // PUBLIC PURE
    //
    //

    // TODO document
    function RecoverSigner(
        bytes memory mes,
        bytes memory sgn
    ) public pure returns (address) {
        return
            ECDSA.recover(
                keccak256(
                    abi.encodePacked(
                        "\x19Ethereum Signed Message:\n",
                        Strings.toString(mes.length),
                        string(mes)
                    )
                ),
                sgn
            );
    }

    // TODO document
    function DepositMessage(
        uint64 tim,
        address wal
    ) public pure returns (bytes memory) {
        return
            abi.encodePacked(
                "deposit",
                "-",
                Strings.toString(tim),
                "-",
                Strings.toHexString(wal)
            );
    }

    // TODO document
    function RequestMessage(
        address grd,
        uint64 tim,
        address pla
    ) public pure returns (bytes memory) {
        return
            abi.encodePacked(
                "request",
                "-",
                Strings.toString(tim),
                "-",
                Strings.toHexString(grd),
                "-",
                Strings.toHexString(pla)
            );
    }

    //
    //
    // PRIVATE
    //
    //

    // Verify the given signer address and associate the verified Signer with
    // the calling Wallet.
    function deposit(uint64 tim, address sig, bytes memory sgn) private {
        //
        // verify
        //

        // wal is the user's Wallet address which is attempting to deposit the
        // provided amount as deposited balance.
        address wal = msg.sender;
        // rec is the user's Signer address that generated the provided
        // signature. This address points to the user's Wallet.
        address rec = RecoverSigner(DepositMessage(tim, wal), sgn);

        // Ensure that the given Signer is not the caller itself. We want to
        // implement one coherent version of account abstraction, without
        // exceptions.
        if (sig == wal) {
            revert Address(
                "Signer address invalid. The given address must not equal the delegating Wallet."
            );
        }

        // Ensure that the given Signer is non-zero, so that it can be reliably
        // used for signature verification.
        if (sig == address(0)) {
            revert Address(
                "Signer address invalid. The given address must not be zero."
            );
        }

        // Ensure that the given timestamp cannot be too far in the future. This
        // restricts the potential entropy for signature forgery.
        if (tim >= block.timestamp + 60 seconds) {
            revert Process(
                "Unix timestamp invalid. The timestamp must not be more than 60 seconds in the future"
            );
        }

        // Ensure that the given timestamp cannot be in the past. This
        // restricts the potential entropy for signature forgery.
        if (tim <= block.timestamp - 60 seconds) {
            revert Process(
                "Unix timestamp invalid. The timestamp must not be older than 60 seconds."
            );
        }

        // Ensure that the provided Signer address maps to the recovered Signer
        // address. Only if this check passes, it is safe for the Registry to
        // associate the given Wallet and Signer addresses.
        if (sig != rec) {
            revert Address(
                "Signer address invalid. The recovered Signer does not map to the provided address."
            );
        }

        //
        // update
        //

        // sws
        address sws = _signerWallet[sig];
        // wsw
        address wsw = _walletSigner[wal];

        // Ensure that we delete the old Signer that might be replaced by this
        // update cycle.
        if (sws == address(0) && wsw != address(0)) {
            delete _signerWallet[wsw];
        }

        // Track the Wallet-Signer relationship for lookups from both
        // directions. Eventually we need to know which Signer points to which
        // Wallet, and which Wallet points to which Signer.
        {
            _signerWallet[sig] = wal;
            _walletSigner[wal] = sig;
        }
    }

    // TODO document
    function release(address grd, uint256 kil, address wal) private {
        //
        uint256 alo = _allocatedBalance[wal];

        // Ensure that the losing Player has in fact requested to be resolved
        // by the provided Guardian address.
        if (_walletGuardian[wal] != grd) {
            revert Address(
                "Guardian release invalid. Wallet address not mapped to Guardian address."
            );
        }

        uint256 grdBal;
        uint256 benBal;
        uint256 walBal;
        unchecked {
            grdBal = (alo * BASIS_GUARDIAN) / BASIS_TOTAL;
            benBal = (alo * BASIS_GUARDIAN) / BASIS_TOTAL;
            walBal = (alo - (grdBal + benBal));
        }

        unchecked {
            _depositedBalance[grd] += grdBal;
            _depositedBalance[beneficiary] += benBal;
            _depositedBalance[wal] += walBal;
        }

        {
            delete _allocatedBalance[wal];
            delete _walletGuardian[wal];
            delete _walletTimestamp[wal];
        }

        {
            emit GuardianResolve(grd, kil, address(0), wal, walBal, buyin);
        }
    }

    // TODO document
    function resolve(
        address grd,
        uint256 kil,
        address win,
        address los
    ) private {
        //
        uint256 aloLos = _allocatedBalance[los];

        // feeBal is the amount of tokens distributed to the winner address.
        uint256 feeBal;
        // grdBal is the amount of tokens distributed to the guardian address.
        uint256 grdBal;
        // benBal is the amount of tokens distributed to the beneficiary
        // address.
        uint256 benBal;
        // aloBal is the amount of tokens distributed to the winner's allocated
        // balance.
        uint256 aloBal;
        // depBal is the amount of tokens distributed to the winner's deposited
        // balance.
        uint256 depBal;
        unchecked {
            feeBal = (aloLos * BASIS_FEE) / BASIS_TOTAL;
            grdBal = (aloLos * BASIS_GUARDIAN) / BASIS_TOTAL;
            benBal = (aloLos - (feeBal + grdBal));
            aloBal = (feeBal * BASIS_SPLIT) / BASIS_TOTAL;
            depBal = (feeBal - aloBal);
        }

        unchecked {
            // Move half of the allocated loser balance to the allocated winner
            // balance. This makes the game allocation of the winning player
            // bigger. If this winning player is going to be defeated by another
            // player eventually, then this new winning player wins a bigger
            // allocation.
            _allocatedBalance[win] += aloBal;
            // Move half of the allocated loser balance to the deposited winner
            // balance. This secures some of the winnings so that winners may
            // recoup their entry allocation and eventually get away with
            // profits.
            _depositedBalance[win] += depBal;
            // Add the increase in deposited balance to the historical net gain
            // of the winner player. The amount of tokens added here is the
            // cumulative value that winning players earn over time.
            _historicGain[win] += depBal;
        }

        unchecked {
            // Remove the buyin amount from the historical net gain of the
            // losing player. This reduces the historical performance of losing
            // players up to zero.
            if (_historicGain[los] < buyin) {
                delete _historicGain[los];
            } else {
                _historicGain[los] -= buyin;
            }
            // Take all allocated balance away from the losing player. That
            // enables the losing player to enter the same game again, if they
            // wish to.
            delete _allocatedBalance[los];
            // Remove the game ID from the mapping of the losing player. That
            // enables the losing player to enter any game again, if they wish
            // to.
            delete _walletGuardian[los];
            // Reset the registration timestamp of the losing player
            delete _walletTimestamp[los];
        }

        unchecked {
            // Make the guardian fees withdrawable for the guardian address
            // resolving this game state.
            _depositedBalance[grd] += grdBal;
            // Make the protocol fees withdrawable for the beneficiary address.
            // The amount that the protocol earns is the rest of the loser's
            // allocation, after deducting the winner's allocation and the
            // guardian fees. This rest amount includes any eventual precision
            // loss.
            _depositedBalance[beneficiary] += benBal;
        }

        // Emit an event for the guardian resolution. This allows us to filter
        // for events resolved by a particular guardian.
        {
            emit GuardianResolve(grd, kil, win, los, depBal, buyin);
        }
    }
}
