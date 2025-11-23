// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @notice Mock USDC token for testnets without native USDC (e.g., Rari)
 * @dev Allows public minting for testing purposes
 */
contract MockUSDC is ERC20 {
    uint8 private _decimals;

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) ERC20(name, symbol) {
        _decimals = decimals_;
    }

    /**
     * @notice Mint tokens to any address (public for testing)
     * @param to Address to mint to
     * @param amount Amount to mint (6 decimals)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @notice Get decimals (6 for USDC)
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
}

