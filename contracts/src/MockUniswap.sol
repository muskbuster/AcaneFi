// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUniswap
 * @notice Mock Uniswap contract for testing copy trading
 * Accepts USDC and mints tokens (ETH, WBTC, ZEC) based on current prices
 */
contract MockUniswap is Ownable {
    using SafeERC20 for IERC20;

    // Token types
    enum TokenType {
        ETH,
        WBTC,
        ZEC
    }

    // USDC token address
    IERC20 public immutable usdc;

    // Mock token contracts
    mapping(TokenType => IERC20) public tokens;

    // Price oracle (owner can set prices, or use external oracle)
    mapping(TokenType => uint256) public prices; // Price in USDC (6 decimals for USDC, 18 decimals for tokens)
    
    // Events
    event Swap(
        address indexed user,
        TokenType tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 price
    );

    constructor(address _usdc) Ownable(msg.sender) {
        require(_usdc != address(0), "MockUniswap: Invalid USDC address");
        usdc = IERC20(_usdc);
    }

    /**
     * @notice Set mock token address for a token type
     */
    function setToken(TokenType _tokenType, address _tokenAddress) external onlyOwner {
        require(_tokenAddress != address(0), "MockUniswap: Invalid token address");
        tokens[_tokenType] = IERC20(_tokenAddress);
    }

    /**
     * @notice Set price for a token (in USDC, 6 decimals)
     * @param _tokenType Token type (ETH, WBTC, ZEC)
     * @param _price Price in USDC (6 decimals, e.g., 2000 * 1e6 for $2000)
     */
    function setPrice(TokenType _tokenType, uint256 _price) external onlyOwner {
        require(_price > 0, "MockUniswap: Invalid price");
        prices[_tokenType] = _price;
        emit PriceUpdated(_tokenType, _price);
    }

    /**
     * @notice Swap USDC for a token
     * @param _tokenType Token type to receive (ETH, WBTC, ZEC)
     * @param _amountIn Amount of USDC to swap (6 decimals)
     * @param _amountOutMin Minimum amount of tokens to receive (slippage protection)
     * @return amountOut Amount of tokens received
     */
    function swapExactInputSingle(
        TokenType _tokenType,
        uint256 _amountIn,
        uint256 _amountOutMin
    ) external returns (uint256 amountOut) {
        require(_amountIn > 0, "MockUniswap: Invalid amount");
        require(address(tokens[_tokenType]) != address(0), "MockUniswap: Token not set");
        require(prices[_tokenType] > 0, "MockUniswap: Price not set");

        // Calculate amount out based on price
        // price is in USDC (6 decimals) per token (18 decimals)
        // amountOut = (amountIn * 1e18) / price
        // This gives us tokens with 18 decimals
        amountOut = (_amountIn * 1e18) / prices[_tokenType];

        require(amountOut >= _amountOutMin, "MockUniswap: Insufficient output amount");

        // Transfer USDC from user
        usdc.safeTransferFrom(msg.sender, address(this), _amountIn);

        // Mint tokens to user using the mock token's mintTo function
        IERC20 tokenOut = tokens[_tokenType];
        
        // Call mintTo function on the token contract
        // MockToken allows MockUniswap to mint tokens
        (bool success, ) = address(tokenOut).call(
            abi.encodeWithSignature("mintTo(address,uint256)", msg.sender, amountOut)
        );
        
        if (!success) {
            revert("MockUniswap: Mint failed");
        }

        emit Swap(msg.sender, _tokenType, _amountIn, amountOut, prices[_tokenType]);
    }

    /**
     * @notice Get quote for swapping USDC to token
     * @param _tokenType Token type to receive
     * @param _amountIn Amount of USDC to swap (6 decimals)
     * @return amountOut Amount of tokens that would be received
     */
    function getQuote(
        TokenType _tokenType,
        uint256 _amountIn
    ) external view returns (uint256 amountOut) {
        require(prices[_tokenType] > 0, "MockUniswap: Price not set");
        amountOut = (_amountIn * 1e18) / prices[_tokenType];
    }

    /**
     * @notice Get current price for a token
     */
    function getPrice(TokenType _tokenType) external view returns (uint256) {
        return prices[_tokenType];
    }

    event PriceUpdated(TokenType indexed tokenType, uint256 newPrice);
}

