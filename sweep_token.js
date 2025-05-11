const fs = require('fs');
const { Connection, Keypair, PublicKey, Transaction } = require('@solana/web3.js');
const { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const base58 = require('bs58');
require('dotenv').config();

// Read source private keys from file
const privateKeyFile = 'private-key-clone.txt';
if (!fs.existsSync(privateKeyFile)) {
    console.error(`File ${privateKeyFile} not found.`);
    process.exit(1);
}

const sourceKeys = fs.readFileSync(privateKeyFile, 'utf8')
    .split('\n')
    .filter(line => line.trim() !== '');

// Connect to Solana cluster
const connection = new Connection('https://api.mainnet-beta.solana.com');

// Get destination wallet from private key in .env
const mainWalletKey = base58.decode(process.env.MAIN_ADDRESS);
const mainWallet = Keypair.fromSecretKey(mainWalletKey);
const destinationPubKey = mainWallet.publicKey;

// Get token mint and amount from .env
const tokenMint = new PublicKey(process.env.TOKEN_ADDRESS);
const tokenAmount = parseFloat(process.env.ADDRESS_TOKEN_AMOUNT);

async function sweepToken(sourcePrivateKey) {
    try {
        const decodedKey = base58.decode(sourcePrivateKey.trim());
        const sourceWallet = Keypair.fromSecretKey(decodedKey);

        // Get source token account
        const sourceTokenAccount = await getAssociatedTokenAddress(
            tokenMint,
            sourceWallet.publicKey,
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        // Get destination token account
        const destinationTokenAccount = await getAssociatedTokenAddress(
            tokenMint,
            destinationPubKey,
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        try {
            // Check token balance
            const tokenBalance = await connection.getTokenAccountBalance(sourceTokenAccount);
            const currentBalance = tokenBalance.value.uiAmount;

            if (currentBalance < tokenAmount) {
                console.log(`Skipping wallet ${sourceWallet.publicKey.toString()} - insufficient token balance: ${currentBalance}`);
                return;
            }

            // Create transfer instruction
            const transferInstruction = createTransferInstruction(
                sourceTokenAccount,
                destinationTokenAccount,
                sourceWallet.publicKey,
                tokenAmount * Math.pow(10, 8) // PAWS token has 8 decimals
            );

            const transaction = new Transaction().add(transferInstruction);

            // Get the latest blockhash
            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = sourceWallet.publicKey;

            // Sign and send the transaction
            const signature = await connection.sendTransaction(transaction, [sourceWallet]);
            
            console.log(`\nTransferred ${tokenAmount} tokens from ${sourceWallet.publicKey.toString()}`);
            console.log(`Transaction signature: ${signature}`);
            
            // Wait for confirmation
            await connection.confirmTransaction(signature);
        } catch (error) {
            if (error.message.includes('could not find account')) {
                console.log(`No token account found for wallet ${sourceWallet.publicKey.toString()}`);
            } else {
                throw error;
            }
        }
    } catch (error) {
        console.error('Error sweeping tokens:', error.message);
    }
}

async function main() {
    try {
        console.log(`Starting to sweep ${tokenAmount} tokens to ${destinationPubKey.toString()}`);
        console.log(`Found ${sourceKeys.length} wallets to check\n`);

        // First ensure destination token account exists
        const destinationTokenAccount = await getAssociatedTokenAddress(
            tokenMint,
            destinationPubKey,
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        // Process transfers sequentially
        for (const sourceKey of sourceKeys) {
            await sweepToken(sourceKey);
            // Add a small delay between transactions
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        console.log('\nToken sweep completed!');
    } catch (error) {
        console.error('Error in main process:', error.message);
    }
}

main();