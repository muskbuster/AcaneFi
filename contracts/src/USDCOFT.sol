// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@layerzerolabs/oft-evm/contracts/OFT.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title USDCOFT
 * @notice LayerZero OFT implementation for USDC cross-chain transfers
 * @dev Based on: https://docs.layerzero.network/v2/developers/evm/oft/quickstart
 * @dev This is a new OFT token that represents USDC across chains
 * @dev OFT already includes Ownable functionality via OApp
 */
contract USDCOFT is OFT {
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) OFT(_name, _symbol, _lzEndpoint, _delegate) Ownable(_delegate) {
        // USDCOFT starts with 0 supply
        // Tokens are minted when users deposit USDC and burned when bridging
    }

    /**
     * @notice Mint USDCOFT tokens when user deposits USDC
     * @dev Only callable by owner (e.g., UnifiedVault)
     * @param to Address to mint tokens to
     * @param amount Amount of USDCOFT to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "USDCOFT: Invalid address");
        require(amount > 0, "USDCOFT: Invalid amount");
        _mint(to, amount);
    }

    /**
     * @notice Transfer USDCOFT tokens (used by UnifiedVault to give tokens to users)
     * @dev This allows UnifiedVault to transfer tokens it receives when users deposit USDC
     * @param to Address to transfer tokens to
     * @param amount Amount of USDCOFT to transfer
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        return super.transfer(to, amount);
    }

    /**
     * @notice Burn USDCOFT tokens
     * @dev Only callable by authorized contracts or users
     * @param from Address to burn tokens from
     * @param amount Amount of USDCOFT to burn
     */
    function burn(address from, uint256 amount) external {
        require(amount > 0, "USDCOFT: Invalid amount");
        
        // Allow owner or the token holder to burn
        if (msg.sender != from && msg.sender != owner()) {
            require(allowance(from, msg.sender) >= amount, "USDCOFT: Insufficient allowance");
            _spendAllowance(from, msg.sender, amount);
        }
        
        _burn(from, amount);
    }

    /**
     * @notice Send USDCOFT cross-chain via LayerZero
     * @dev Uses OFT's built-in send() function - users call this directly
     * The OFT contract inherits send() from OFTCore
     * Users should call: send(SendParam, MessagingFee, address payable refundTo)
     * 
     * Example:
     * ```solidity
     * USDCOFT.send(
     *     SendParam({
     *         dstEid: 40245,        // Base Sepolia endpoint ID
     *         to: recipientBytes32,
     *         amountLD: amount,
     *         minAmountLD: amount
     *     }),
     *     MessagingFee({
     *         nativeFee: fee,
     *         lzTokenFee: 0
     *     }),
     *     refundTo
     * )
     * ```
     */
    // send() function is inherited from OFT - no need to override
}

