// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CCTPBridge
 * @notice Helper contract for CCTP cross-chain USDC transfers
 * @dev Users can interact directly with CCTP contracts, but this provides a convenience wrapper
 * Based on: https://developers.circle.com/cctp/transfer-usdc-on-testnet-from-ethereum-to-avalanche
 * Note: receiveMessage on MessageTransmitter is permissionless - no TEE needed
 */
interface ITokenMessenger {
    function depositForBurn(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken
    ) external returns (uint64 nonce);
}

interface IMessageTransmitter {
    function receiveMessage(
        bytes memory message,
        bytes calldata attestation
    ) external returns (bool success);
}

contract CCTPBridge is Ownable {
    using SafeERC20 for IERC20;

    // CCTP contracts
    ITokenMessenger public tokenMessenger;
    IMessageTransmitter public messageTransmitter;
    address public usdcToken;
    
    // Base domain ID (where trading happens)
    uint32 public constant BASE_DOMAIN = 6; // Base Sepolia domain
    uint32 public constant ARC_DOMAIN = 26; // Arc Testnet domain
    
    // TEE wallet address on Base (where funds are bridged to)
    address public teeWallet;
    
    // Track pending burns
    mapping(uint64 => bool) public processedNonces;
    
    event USDCBurned(
        address indexed user,
        uint256 amount,
        uint32 sourceDomain,
        uint64 nonce
    );
    
    event USDCReceived(
        address indexed recipient,
        uint256 amount,
        uint32 sourceDomain
    );

    constructor(
        address _tokenMessenger,
        address _messageTransmitter,
        address _usdcToken,
        address _teeWallet
    ) Ownable(msg.sender) {
        require(_tokenMessenger != address(0), "CCTPBridge: Invalid TokenMessenger");
        require(_messageTransmitter != address(0), "CCTPBridge: Invalid MessageTransmitter");
        require(_usdcToken != address(0), "CCTPBridge: Invalid USDC");
        require(_teeWallet != address(0), "CCTPBridge: Invalid TEE wallet");
        
        tokenMessenger = ITokenMessenger(_tokenMessenger);
        messageTransmitter = IMessageTransmitter(_messageTransmitter);
        usdcToken = _usdcToken;
        teeWallet = _teeWallet;
    }

    /**
     * @notice Burn USDC on source chain to bridge to Base
     * @param amount Amount of USDC to burn
     */
    function burnAndBridge(uint256 amount) external {
        require(amount > 0, "CCTPBridge: Invalid amount");
        
        // Transfer USDC from user
        IERC20(usdcToken).safeTransferFrom(msg.sender, address(this), amount);
        
        // Approve TokenMessenger to burn
        // Note: safeApprove is deprecated, use approve and handle zero allowance
        IERC20(usdcToken).approve(address(tokenMessenger), 0);
        IERC20(usdcToken).approve(address(tokenMessenger), amount);
        
        // Convert TEE wallet address to bytes32 for mint recipient
        bytes32 mintRecipient = addressToBytes32(teeWallet);
        
        // Burn USDC and initiate cross-chain transfer
        uint64 nonce = tokenMessenger.depositForBurn(
            amount,
            BASE_DOMAIN,
            mintRecipient,
            usdcToken
        );
        
        emit USDCBurned(msg.sender, amount, getCurrentDomain(), nonce);
    }

    /**
     * @notice Receive bridged USDC on Base (permissionless - anyone can call)
     * @param message The message from source chain
     * @param attestation The attestation from Circle's Attestation Service
     * @dev receiveMessage on MessageTransmitter is permissionless - no TEE needed
     */
    function receiveBridgedUSDC(
        bytes memory message,
        bytes calldata attestation
    ) external {
        // Receive message and mint USDC on Base
        // USDC is automatically minted to the mintRecipient specified in depositForBurn
        bool success = messageTransmitter.receiveMessage(message, attestation);
        require(success, "CCTPBridge: Failed to receive message");
        
        emit USDCReceived(teeWallet, 0, 0); // Amount extracted from message in production
    }

    /**
     * @notice Update TEE wallet address
     */
    function setTEEWallet(address _teeWallet) external onlyOwner {
        require(_teeWallet != address(0), "CCTPBridge: Invalid address");
        teeWallet = _teeWallet;
    }

    /**
     * @notice Get current domain ID (helper function)
     * @dev In production, this would be determined by chain ID
     */
    function getCurrentDomain() public view returns (uint32) {
        // This would be set based on deployment chain
        // For now, return a placeholder - should be set in constructor or via setter
        return 0;
    }

    /**
     * @notice Convert address to bytes32 for CCTP
     */
    function addressToBytes32(address addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(addr)));
    }
}

