const fs = require('fs');
const { Connection, Keypair, PublicKey, Transaction } = require('@solana/web3.js');
const { getAssociatedTokenAddress, createCloseAccountInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const base58 = require('bs58');
require('dotenv').config();

// Read wallet private keys from file
const privateKeyFile = 'private-key-clone.txt';
if (!fs.existsSync(privateKeyFile)) {
    console.error(`File ${privateKeyFile} not found.`);
    process.exit(1);
}

const walletKeys = fs.readFileSync(privateKeyFile, 'utf8')
    .split('\n')
    .filter(line => line.trim() !== '');

// Connect to Solana cluster
const connection = new Connection('https://api.mainnet-beta.solana.com');

// Get token mint from .env
const tokenMint = new PublicKey(process.env.TOKEN_ADDRESS);

async function closeTokenAccount(privateKey) {
    try {
        const decodedKey = base58.decode(privateKey.trim());
        const wallet = Keypair.fromSecretKey(decodedKey);

        // Get the associated token account address
        const tokenAccount = await getAssociatedTokenAddress(
            tokenMint,
            wallet.publicKey,
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        try {
            // Check if token account exists and get its balance
            const accountInfo = await connection.getTokenAccountBalance(tokenAccount);
            
            // If account has tokens, we can't close it
            if (accountInfo.value.amount !== '0') {
                console.log(`Cannot close account for ${wallet.publicKey.toString()} - Account still has ${accountInfo.value.uiAmount} tokens`);
                return;
            }

            // Create close account instruction
            const closeInstruction = createCloseAccountInstruction(
                tokenAccount,          // Token account to close
                wallet.publicKey,      // Destination for rent SOL
                wallet.publicKey,      // Authority to close account
                [],                    // No multisig
                TOKEN_PROGRAM_ID
            );

            const transaction = new Transaction().add(closeInstruction);

            // Get the latest blockhash
            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = wallet.publicKey;

            // Sign and send the transaction
            const signature = await connection.sendTransaction(transaction, [wallet]);
            
            console.log(`\nClosed token account for wallet ${wallet.publicKey.toString()}`);
            console.log(`Transaction signature: ${signature}`);
            
            // Wait for confirmation
            await connection.confirmTransaction(signature);

            // Get SOL balance after closing
            const solBalance = await connection.getBalance(wallet.publicKey);
            console.log(`Current SOL balance: ${solBalance / 1000000000} SOL\n`);

        } catch (error) {
            if (error.message.includes('could not find account')) {
                console.log(`No token account found for wallet ${wallet.publicKey.toString()} - Nothing to close`);
            } else {
                throw error;
            }
        }
    } catch (error) {
        console.error('Error closing token account:', error.message);
    }
}

async function main() {
    try {
        console.log(`Starting to close token accounts for ${walletKeys.length} wallets...\n`);

        let walletsProcessed = 0;
        let accountsClosed = 0;

        // Process wallets sequentially
        for (const privateKey of walletKeys) {
            await closeTokenAccount(privateKey);
            walletsProcessed++;
            
            // Add a small delay between transactions
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        console.log('Token account closing process completed!');
        console.log(`Processed ${walletsProcessed} wallets`);
    } catch (error) {
        console.error('Error in main process:', error.message);
    }
}

main();