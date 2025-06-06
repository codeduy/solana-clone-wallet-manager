# Solana Clone Wallet Manager

A tool for managing Solana wallets with SOL/Token transfer and sweeping functionality.

## Installation

1. Install Node.js (version 14 or higher)
2. Clone this repository
3. Install dependencies:
```bash
npm install
```

4. Create a `.env` file with the following content:
```env
MAIN_ADDRESS="main_wallet_private_key"
TOKEN_ADDRESS="token_contract_address"
SOL_AMOUNT="sol_amount_to_transfer"
ADDRESS_TOKEN_AMOUNT="token_amount_to_transfer"
```

5. Create a `private-key-clone.txt` file containing the list of clone wallet private keys, one per line

## Usage

Run the program:
```bash
node main.js
```

### Features:

1. **Check SOL balance**: Check SOL balance of all clone wallets and save results to `balance-SOL.txt`

2. **Check Token balance**: Check token balance of all clone wallets and save results to `balance-token.txt`

3. **Send SOL**: Transfer SOL from main wallet to clone wallets with amount configured in `SOL_AMOUNT`

4. **Send Token**: Transfer tokens from main wallet to clone wallets with amount configured in `ADDRESS_TOKEN_AMOUNT`

5. **Sweep SOL**: Transfer all SOL from clone wallets to main wallet (minus transaction fees)

6. **Sweep Token (fixed amount)**: Transfer tokens from clone wallets to main wallet with amount configured in `ADDRESS_TOKEN_AMOUNT`

7. **Sweep all Tokens**: Transfer all tokens from clone wallets to main wallet

8. **Close Token Account**: Close token accounts and return SOL rent to the owner

## Important Notes

- Ensure the main wallet has enough SOL for transaction fees
- Double-check all parameters in the `.env` file before executing transactions
- Keep `private-key-clone.txt` and `.env` files secure as they contain sensitive information
- Test with small amounts before performing large transactions

## File Structure

- `main.js`: Main program control file
- `check_balance.js`: Check SOL balances
- `check_token_balance.js`: Check token balances
- `transfer_sol.js`: Transfer SOL from main to clone wallets
- `transfer_token.js`: Transfer tokens from main to clone wallets
- `sweep_sol.js`: Sweep SOL to main wallet
- `sweep_token.js`: Sweep tokens to main wallet (fixed amount)
- `sweep_all_tokens.js`: Sweep all tokens to main wallet
- `close_token_accounts.js`: Close token accounts
