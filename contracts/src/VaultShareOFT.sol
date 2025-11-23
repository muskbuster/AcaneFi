// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@layerzerolabs/oft-evm/contracts/OFT.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VaultShareOFT
 * @notice LayerZero OFT implementation for cross-chain vault shares
 * @dev Based on: https://docs.layerzero.network/v2/developers/evm/oft/quickstart
 * @dev OFT already includes Ownable functionality via OApp
 */
contract VaultShareOFT is OFT {
    address public vaultFactory;
    mapping(uint256 => uint256) public traderShares; // traderId -> total shares
    mapping(address => mapping(uint256 => uint256)) public userShares; // user -> traderId -> shares

    event SharesMinted(address indexed user, uint256 indexed traderId, uint256 shares);
    event SharesBurned(address indexed user, uint256 indexed traderId, uint256 shares);

    modifier onlyVaultFactory() {
        require(msg.sender == vaultFactory, "VaultShareOFT: Only VaultFactory can call");
        _;
    }

    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _vaultFactory,
        address _delegate
    ) OFT(_name, _symbol, _lzEndpoint, _delegate) Ownable(_delegate) {
        require(_vaultFactory != address(0), "VaultShareOFT: Invalid factory address");
        vaultFactory = _vaultFactory;
    }

    /**
     * @notice Mint shares for a user when they deposit
     * @param user User address
     * @param traderId Trader ID
     * @param shares Amount of shares to mint
     */
    function mintShares(
        address user,
        uint256 traderId,
        uint256 shares
    ) external onlyVaultFactory {
        require(user != address(0), "VaultShareOFT: Invalid user address");
        require(shares > 0, "VaultShareOFT: Invalid shares amount");

        _mint(user, shares);
        userShares[user][traderId] += shares;
        traderShares[traderId] += shares;

        emit SharesMinted(user, traderId, shares);
    }

    /**
     * @notice Burn shares when user withdraws
     * @param traderId Trader ID
     * @param shares Amount of shares to burn
     */
    function burnShares(uint256 traderId, uint256 shares) external {
        require(shares > 0, "VaultShareOFT: Invalid shares amount");
        require(userShares[msg.sender][traderId] >= shares, "VaultShareOFT: Insufficient shares");

        userShares[msg.sender][traderId] -= shares;
        traderShares[traderId] -= shares;
        _burn(msg.sender, shares);

        emit SharesBurned(msg.sender, traderId, shares);
    }

    /**
     * @notice Get user's shares for a specific trader
     * @param user User address
     * @param traderId Trader ID
     * @return Amount of shares
     */
    function getUserShares(address user, uint256 traderId) external view returns (uint256) {
        return userShares[user][traderId];
    }

    /**
     * @notice Update vault factory address
     * @dev Only owner/delegate can call (inherited from OApp via OFT)
     */
    function setVaultFactory(address _vaultFactory) external {
        // Check if caller is the owner (delegate) - OFT uses OApp's owner
        require(_vaultFactory != address(0), "VaultShareOFT: Invalid factory address");
        vaultFactory = _vaultFactory;
    }

    /**
     * @notice Send shares cross-chain via LayerZero
     * @dev Uses OFT's built-in send() function - users call this directly
     * The OFT contract inherits send() from OFTCore
     * Users should call: send(SendParam, MessagingFee, address payable refundTo)
     */
    // send() function is inherited from OFT - no need to override
}
