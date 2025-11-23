// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IVaultShareOFT {
    function mintShares(address user, uint256 traderId, uint256 shares) external;
}

/**
 * @title VaultFactory
 * @notice Core vault factory contract managing trader registration and deposits
 */
contract VaultFactory is Ownable {
    using SafeERC20 for IERC20;

    // Core mappings
    mapping(address => bool) public registeredTraders;
    mapping(uint256 => address) public traderIdToAddress;
    mapping(address => uint256) public addressToTraderId;
    mapping(address => mapping(uint256 => uint256)) public userDeposits; // user -> traderId -> amount
    mapping(uint256 => uint256) public traderTVL; // traderId -> total deposits
    mapping(uint256 => address) public traderVault; // traderId -> vault address

    // State variables
    address public teeAddress; // TEE service address
    address public usdcToken; // USDC token address
    address public vaultShareOFT; // OFT vault shares contract
    uint256 public nextTraderId = 1;

    // Events
    event TraderRegistered(address indexed trader, uint256 indexed traderId, address indexed vault);
    event Deposit(address indexed user, uint256 indexed traderId, uint256 amount);
    event Withdrawal(address indexed user, uint256 indexed traderId, uint256 amount);
    event TEEAddressUpdated(address indexed oldTEE, address indexed newTEE);
    event VaultShareOFTUpdated(address indexed oldOFT, address indexed newOFT);

    modifier onlyTEE() {
        require(msg.sender == teeAddress, "VaultFactory: Only TEE can call");
        _;
    }

    constructor(address _teeAddress, address _usdcToken) Ownable(msg.sender) {
        require(_teeAddress != address(0), "VaultFactory: Invalid TEE address");
        require(_usdcToken != address(0), "VaultFactory: Invalid USDC address");
        teeAddress = _teeAddress;
        usdcToken = _usdcToken;
    }

    /**
     * @notice Register a new trader (only callable by TEE)
     * @param trader Address of the trader to register
     * @return traderId The assigned trader ID
     */
    function registerTrader(address trader) external onlyTEE returns (uint256) {
        require(trader != address(0), "VaultFactory: Invalid trader address");
        require(!registeredTraders[trader], "VaultFactory: Trader already registered");
        require(addressToTraderId[trader] == 0, "VaultFactory: Trader already has ID");

        uint256 traderId = nextTraderId++;
        registeredTraders[trader] = true;
        traderIdToAddress[traderId] = trader;
        addressToTraderId[trader] = traderId;

        emit TraderRegistered(trader, traderId, address(0));
        return traderId;
    }

    /**
     * @notice Set vault address for a trader
     * @param traderId The trader ID
     * @param vault The vault contract address
     */
    function setTraderVault(uint256 traderId, address vault) external onlyTEE {
        require(traderIdToAddress[traderId] != address(0), "VaultFactory: Invalid trader ID");
        require(vault != address(0), "VaultFactory: Invalid vault address");
        traderVault[traderId] = vault;
    }

    /**
     * @notice Deposit USDC to a trader's vault
     * @param traderId The trader ID to deposit to
     * @param amount Amount of USDC to deposit
     */
    function depositToTrader(uint256 traderId, uint256 amount) external {
        require(traderIdToAddress[traderId] != address(0), "VaultFactory: Invalid trader ID");
        require(amount > 0, "VaultFactory: Amount must be greater than 0");
        require(registeredTraders[traderIdToAddress[traderId]], "VaultFactory: Trader not registered");

        // Transfer USDC from user
        IERC20(usdcToken).safeTransferFrom(msg.sender, address(this), amount);

        // Update mappings
        userDeposits[msg.sender][traderId] += amount;
        traderTVL[traderId] += amount;

        // Mint OFT shares if vault share contract is set
        if (vaultShareOFT != address(0)) {
            // Mint shares 1:1 with USDC deposit
            IVaultShareOFT(vaultShareOFT).mintShares(msg.sender, traderId, amount);
        }

        emit Deposit(msg.sender, traderId, amount);
    }

    /**
     * @notice Withdraw USDC from a trader's vault
     * @param traderId The trader ID to withdraw from
     * @param amount Amount of USDC to withdraw
     */
    function withdrawFromTrader(uint256 traderId, uint256 amount) external {
        require(traderIdToAddress[traderId] != address(0), "VaultFactory: Invalid trader ID");
        require(amount > 0, "VaultFactory: Amount must be greater than 0");
        require(userDeposits[msg.sender][traderId] >= amount, "VaultFactory: Insufficient balance");

        // Note: User should burn OFT shares before withdrawing
        // Shares are burned via VaultShareOFT.burnShares() by user

        // Update mappings
        userDeposits[msg.sender][traderId] -= amount;
        traderTVL[traderId] -= amount;

        // Transfer USDC to user
        IERC20(usdcToken).safeTransfer(msg.sender, amount);

        emit Withdrawal(msg.sender, traderId, amount);
    }

    /**
     * @notice Get user's total deposit for a trader
     * @param user User address
     * @param traderId Trader ID
     * @return Amount deposited
     */
    function getUserDeposit(address user, uint256 traderId) external view returns (uint256) {
        return userDeposits[user][traderId];
    }

    /**
     * @notice Update TEE address (only owner)
     */
    function setTEEAddress(address _teeAddress) external onlyOwner {
        require(_teeAddress != address(0), "VaultFactory: Invalid TEE address");
        address oldTEE = teeAddress;
        teeAddress = _teeAddress;
        emit TEEAddressUpdated(oldTEE, _teeAddress);
    }

    /**
     * @notice Set vault share OFT contract address
     */
    function setVaultShareOFT(address _vaultShareOFT) external onlyOwner {
        require(_vaultShareOFT != address(0), "VaultFactory: Invalid OFT address");
        address oldOFT = vaultShareOFT;
        vaultShareOFT = _vaultShareOFT;
        emit VaultShareOFTUpdated(oldOFT, _vaultShareOFT);
    }

    /**
     * @notice Check if trader is registered
     */
    function isTraderRegistered(address trader) external view returns (bool) {
        return registeredTraders[trader];
    }

    /**
     * @notice Get trader address by ID
     */
    function getTraderAddress(uint256 traderId) external view returns (address) {
        return traderIdToAddress[traderId];
    }
}

