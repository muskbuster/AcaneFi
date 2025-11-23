// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./VaultFactory.sol";

/**
 * @title UnifiedVault
 * @notice Unified vault supporting both CCTP (USDC) and LayerZero OFT (shares)
 * @dev Handles deposits via CCTP and share transfers via LayerZero
 */
interface ITokenMessenger {
    function depositForBurn(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken,
        bytes32 destinationCaller,
        uint256 maxFee,
        uint32 minFinalityThreshold
    ) external returns (uint64 nonce);
}

interface IMessageTransmitter {
    function receiveMessage(
        bytes memory message,
        bytes calldata attestation
    ) external returns (bool success);
}

interface IUSDCOFT {
    function mint(address to, uint256 amount) external;
}

contract UnifiedVault is Ownable {
    using SafeERC20 for IERC20;

    VaultFactory public vaultFactory;
    address public usdcToken; // Native USDC token
    address public usdcOFT; // USDCOFT token (LayerZero OFT)
    address public vaultShareOFT; // LayerZero OFT contract for vault shares
    
    // CCTP contracts (optional - can use USDCOFT instead)
    ITokenMessenger public tokenMessenger;
    IMessageTransmitter public messageTransmitter;
    
    // Base Sepolia domain (where trading happens)
    uint32 public constant BASE_SEPOLIA_DOMAIN = 6;
    uint32 public constant ETHEREUM_SEPOLIA_DOMAIN = 0;
    
    // TEE wallet on Base Sepolia (receives bridged USDC)
    address public teeWallet;
    
    // Track deposits
    mapping(address => mapping(uint256 => uint256)) public userDeposits; // user -> traderId -> amount
    mapping(uint256 => uint256) public traderTVL; // traderId -> total deposits
    
    // Track attested receipts (prevent replay attacks)
    mapping(bytes32 => bool) public attestedReceipts; // receipt hash -> used
    uint256 public nonceCounter; // Counter for unique receipts
    
    event DepositInitiated(
        address indexed user,
        uint256 indexed traderId,
        uint256 amount,
        uint32 sourceDomain,
        bytes32 mintRecipient
    );
    
    event DepositReceived(
        address indexed user,
        uint256 indexed traderId,
        uint256 amount,
        uint32 sourceDomain
    );
    
    event AttestedReceiptReceived(
        address indexed teeWallet,
        uint256 amount,
        uint256 nonce,
        uint256 sourceChainId,
        bytes32 receiptHash
    );
    

    constructor(
        address _vaultFactory,
        address _usdcToken,
        address _usdcOFT,
        address _vaultShareOFT,
        address _tokenMessenger,
        address _messageTransmitter,
        address _teeWallet
    ) Ownable(msg.sender) {
        require(_vaultFactory != address(0), "UnifiedVault: Invalid factory");
        require(_usdcToken != address(0), "UnifiedVault: Invalid USDC");
        // USDCOFT and VaultShareOFT can be zero for chains without LayerZero (e.g., Rari)
        // require(_usdcOFT != address(0), "UnifiedVault: Invalid USDCOFT");
        // require(_vaultShareOFT != address(0), "UnifiedVault: Invalid VaultShareOFT");
        // TokenMessenger and MessageTransmitter can be zero for chains without CCTP (e.g., Rari)
        // require(_tokenMessenger != address(0), "UnifiedVault: Invalid TokenMessenger");
        // require(_messageTransmitter != address(0), "UnifiedVault: Invalid MessageTransmitter");
        require(_teeWallet != address(0), "UnifiedVault: Invalid TEE wallet");
        
        vaultFactory = VaultFactory(_vaultFactory);
        usdcToken = _usdcToken;
        usdcOFT = _usdcOFT;
        vaultShareOFT = _vaultShareOFT;
        tokenMessenger = ITokenMessenger(_tokenMessenger);
        messageTransmitter = IMessageTransmitter(_messageTransmitter);
        teeWallet = _teeWallet;
    }

    /**
     * @notice Deposit USDC and receive USDCOFT tokens (LayerZero OFT)
     * @param traderId Trader ID to deposit to
     * @param amount Amount of USDC to deposit
     */
    function depositViaUSDCOFT(
        uint256 traderId,
        uint256 amount
    ) external {
        require(amount > 0, "UnifiedVault: Invalid amount");
        require(vaultFactory.getTraderAddress(traderId) != address(0), "UnifiedVault: Invalid trader");
        
        // Transfer USDC from user
        IERC20(usdcToken).safeTransferFrom(msg.sender, address(this), amount);
        
        // Mint USDCOFT tokens to user (1:1 ratio)
        // UnifiedVault must be owner of USDCOFT contract
        IUSDCOFT(usdcOFT).mint(msg.sender, amount);
        
        // Track deposit
        userDeposits[msg.sender][traderId] += amount;
        traderTVL[traderId] += amount;
        
        emit DepositInitiated(msg.sender, traderId, amount, getCurrentDomain(), bytes32(0));
    }

    /**
     * @notice Deposit USDC via CCTP (burns on source, mints on Base) - Legacy method
     * @param traderId Trader ID to deposit to
     * @param amount Amount of USDC to deposit
     * @param maxFee Maximum fee for fast transfer (optional)
     */
    function depositViaCCTP(
        uint256 traderId,
        uint256 amount,
        uint256 maxFee,
        uint32 minFinalityThreshold
    ) external {
        require(amount > 0, "UnifiedVault: Invalid amount");
        require(vaultFactory.getTraderAddress(traderId) != address(0), "UnifiedVault: Invalid trader");
        
        // Transfer USDC from user
        IERC20(usdcToken).safeTransferFrom(msg.sender, address(this), amount);
        
        // Approve TokenMessenger
        IERC20(usdcToken).approve(address(tokenMessenger), 0);
        IERC20(usdcToken).approve(address(tokenMessenger), amount);
        
        // Convert TEE wallet to bytes32 for mint recipient
        bytes32 mintRecipient = addressToBytes32(teeWallet);
        bytes32 destinationCaller = bytes32(0); // Empty allows any caller
        
        // Burn USDC and initiate CCTP transfer to Base
        uint64 nonce = tokenMessenger.depositForBurn(
            amount,
            BASE_SEPOLIA_DOMAIN,
            mintRecipient,
            usdcToken,
            destinationCaller,
            maxFee,
            minFinalityThreshold
        );
        
        // Track deposit (will be finalized when USDC arrives on Base)
        userDeposits[msg.sender][traderId] += amount;
        traderTVL[traderId] += amount;
        
        emit DepositInitiated(msg.sender, traderId, amount, getCurrentDomain(), mintRecipient);
    }

    /**
     * @notice Deposit mock USDC on Rari (for chains without CCTP)
     * @param traderId Trader ID to deposit to (can be 0 for mockup - no validation)
     * @param amount Amount of mock USDC to deposit
     * @dev User deposits mock USDC, then gets attestation to claim on Base Sepolia
     * @dev For Rari mockup, trader validation is optional (traderId can be 0)
     */
    function depositRari(
        uint256 traderId,
        uint256 amount
    ) external {
        require(amount > 0, "UnifiedVault: Invalid amount");
        // For Rari mockup, we allow traderId 0 (no trader validation needed)
        // If traderId > 0, validate trader exists
        if (traderId > 0) {
            require(vaultFactory.getTraderAddress(traderId) != address(0), "UnifiedVault: Invalid trader");
        }
        
        // Transfer mock USDC from user
        IERC20(usdcToken).safeTransferFrom(msg.sender, address(this), amount);
        
        // Track deposit
        userDeposits[msg.sender][traderId] += amount;
        if (traderId > 0) {
            traderTVL[traderId] += amount;
        }
        
        // Emit event - user can then get attestation and call receiveAttested on Base Sepolia
        emit DepositInitiated(msg.sender, traderId, amount, getCurrentDomain(), bytes32(0));
    }

    /**
     * @notice Receive bridged USDC on Base Sepolia (permissionless via CCTP)
     * @param message CCTP message
     * @param attestation CCTP attestation
     */
    function receiveBridgedUSDC(
        bytes memory message,
        bytes calldata attestation
    ) external {
        // Receive message and mint USDC on Base
        bool success = messageTransmitter.receiveMessage(message, attestation);
        require(success, "UnifiedVault: Failed to receive message");
        
        // USDC is automatically minted to teeWallet by CCTP
        // Deposit is already tracked in depositViaCCTP
        emit DepositReceived(teeWallet, 0, 0, BASE_SEPOLIA_DOMAIN);
    }

    /**
     * @notice Finalize deposit on Base Sepolia after USDC arrives
     * @param user User address
     * @param traderId Trader ID
     * @param amount Amount of USDC received
     */
    function finalizeDeposit(
        address user,
        uint256 traderId,
        uint256 amount
    ) external {
        require(msg.sender == teeWallet, "UnifiedVault: Only TEE wallet can finalize");
        require(amount > 0, "UnifiedVault: Invalid amount");
        
        // Deposit to vault factory
        IERC20(usdcToken).approve(address(vaultFactory), 0);
        IERC20(usdcToken).approve(address(vaultFactory), amount);
        vaultFactory.depositToTrader(traderId, amount);
        
        // Mint OFT shares proportional to deposit
        // 1:1 ratio for simplicity (can be adjusted)
        IERC20(vaultShareOFT).approve(address(vaultFactory), 0);
        IERC20(vaultShareOFT).approve(address(vaultFactory), amount);
        // VaultFactory will call mintShares on OFT
        
        emit DepositReceived(user, traderId, amount, BASE_SEPOLIA_DOMAIN);
    }

    /**
     * @notice Get current domain (helper)
     */
    function getCurrentDomain() public view returns (uint32) {
        // This should be determined by chain ID
        // For Base Sepolia: 6, Ethereum Sepolia: 0
        return 0; // Should be set based on deployment chain
    }

    /**
     * @notice Convert address to bytes32 for CCTP
     */
    function addressToBytes32(address addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(addr)));
    }

    /**
     * @notice Update TEE wallet address
     */
    function setTEEWallet(address _teeWallet) external onlyOwner {
        require(_teeWallet != address(0), "UnifiedVault: Invalid address");
        teeWallet = _teeWallet;
    }

    /**
     * @notice Get user deposit for a trader
     */
    function getUserDeposit(address user, uint256 traderId) external view returns (uint256) {
        return userDeposits[user][traderId];
    }

    /**
     * @notice Receive attested USDC from Rari (or other chains without CCTP)
     * @dev Verifies signature from TEE wallet and transfers USDC from contract to TEE wallet
     * @param amount Amount of USDC to transfer
     * @param nonce Unique nonce to prevent replay attacks
     * @param sourceChainId Chain ID of source chain (e.g., Rari = 1918988905)
     * @param signature Signature from TEE wallet attesting receipt on source chain
     */
    function receiveAttested(
        uint256 amount,
        uint256 nonce,
        uint256 sourceChainId,
        bytes calldata signature
    ) external {
        require(amount > 0, "UnifiedVault: Invalid amount");
        require(sourceChainId > 0, "UnifiedVault: Invalid source chain ID");
        
        // Create receipt hash (prevents replay attacks)
        bytes32 receiptHash = keccak256(abi.encodePacked(
            address(this), // This contract address
            amount,
            nonce,
            sourceChainId,
            block.chainid // Destination chain ID
        ));
        
        require(!attestedReceipts[receiptHash], "UnifiedVault: Receipt already used");
        
        // Create message hash for EIP-191 signing
        // Message: keccak256(abi.encodePacked(contractAddress, amount, nonce, sourceChainId, destinationChainId))
        bytes32 message = keccak256(abi.encodePacked(
            address(this),
            amount,
            nonce,
            sourceChainId,
            block.chainid
        ));
        
        // CDP SDK's signMessage for hex strings treats them as strings
        // CDP does: keccak256("\x19Ethereum Signed Message:\n" + len(hex_string) + hex_string)
        // For "0x" + 64 hex chars = 66 chars total
        // So: keccak256("\x19Ethereum Signed Message:\n66" + "0x...")
        //
        // MessageHashUtils.toEthSignedMessageHash does: keccak256("\x19Ethereum Signed Message:\n32" + bytes32)
        // These are different!
        //
        // Solution: Convert message to hex string and verify using CDP's format
        string memory messageHex = _bytes32ToHex(message);
        // CDP format: "\x19Ethereum Signed Message:\n" + "66" + "0x..."
        bytes32 messageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n66", messageHex));
        
        // Recover signer from signature
        address signer = ECDSA.recover(messageHash, signature);
        require(signer == teeWallet, "UnifiedVault: Invalid signature or signer");
        
        // Mark receipt as used
        attestedReceipts[receiptHash] = true;
        
        // Check contract has enough USDC
        uint256 contractBalance = IERC20(usdcToken).balanceOf(address(this));
        require(contractBalance >= amount, "UnifiedVault: Insufficient contract balance");
        
        // Transfer USDC from contract to TEE wallet
        IERC20(usdcToken).safeTransfer(teeWallet, amount);
        
        emit AttestedReceiptReceived(teeWallet, amount, nonce, sourceChainId, receiptHash);
    }

    /**
     * @notice Get next nonce for attested receipt
     * @dev Returns current nonce counter (caller should increment)
     */
    function getNextNonce() external view returns (uint256) {
        return nonceCounter;
    }

    /**
     * @notice Increment nonce counter (for external tracking)
     */
    function incrementNonce() external {
        nonceCounter++;
    }

    /**
     * @notice Convert bytes32 to hex string (helper for CDP signature verification)
     */
    function _bytes32ToHex(bytes32 _bytes) internal pure returns (string memory) {
        bytes memory hexChars = "0123456789abcdef";
        bytes memory hexString = new bytes(66); // "0x" + 64 hex chars
        hexString[0] = '0';
        hexString[1] = 'x';
        for (uint256 i = 0; i < 32; i++) {
            hexString[2 + i * 2] = hexChars[uint8(_bytes[i] >> 4)];
            hexString[3 + i * 2] = hexChars[uint8(_bytes[i] & 0x0f)];
        }
        return string(hexString);
    }

    /**
     * @notice Convert uint to string (helper for CDP signature verification)
     */
    function _uintToString(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
}

