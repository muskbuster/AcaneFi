// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockToken
 * @notice Mock ERC20 token with minting capability for testing
 * Used for ETH, WBTC, ZEC mock tokens
 */
contract MockToken is ERC20, Ownable {
    uint8 private _decimals;

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) ERC20(name, symbol) Ownable(msg.sender) {
        _decimals = decimals_;
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @notice Mint tokens to an address (owner only)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @notice Mint tokens to an address (can be called by authorized minter)
     */
    function mintTo(address to, uint256 amount) external {
        // Allow MockUniswap to mint
        // In production, use a proper minter role
        _mint(to, amount);
    }

    /**
     * @notice Public mint for testing (can be removed in production)
     */
    function publicMint(uint256 amount) external {
        _mint(msg.sender, amount);
    }
}

