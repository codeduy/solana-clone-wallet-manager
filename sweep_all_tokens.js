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

// Get token mint from .env
const tokenMint = new PublicKey(process.env.TOKEN_ADDRESS);

async function sweepAllTokens(sourcePrivateKey) {
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
            const currentBalance = tokenBalance.value;

            if (currentBalance.amount === '0') {
                console.log(`Skipping wallet ${sourceWallet.publicKey.toString()} - no tokens available`);
                return;
            }

            // Create transfer instruction for the entire balance
            const transferInstruction = createTransferInstruction(
                sourceTokenAccount,
                destinationTokenAccount,
                sourceWallet.publicKey,
                BigInt(currentBalance.amount) // Transfer the entire amount
            );

            const transaction = new Transaction().add(transferInstruction);

            // Get the latest blockhash
            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = sourceWallet.publicKey;

            // Sign and send the transaction
            const signature = await connection.sendTransaction(transaction, [sourceWallet]);
            
            console.log(`\nTransferred ALL tokens (${currentBalance.uiAmount} ${currentBalance.uiAmountString}) from ${sourceWallet.publicKey.toString()}`);
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
        console.log(`Starting to sweep ALL available tokens to ${destinationPubKey.toString()}`);
        console.log(`Found ${sourceKeys.length} wallets to check\n`);

        // First ensure destination token account exists
        const destinationTokenAccount = await getAssociatedTokenAddress(
            tokenMint,
            destinationPubKey,
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        let totalTokensSent = 0;
        let walletsProcessed = 0;
        let walletsWithTokens = 0;

        // Process transfers sequentially
        for (const sourceKey of sourceKeys) {
            await sweepAllTokens(sourceKey);
            walletsProcessed++;
            
            // Add a small delay between transactions
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        console.log('\nSweep completed!');
        console.log(`Processed ${walletsProcessed} wallets`);
    } catch (error) {
        console.error('Error in main process:', error.message);
    }
}

main();