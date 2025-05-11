const fs = require('fs');
const { Connection, Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
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

async function sweepSol(sourcePrivateKey) {
    try {
        const decodedKey = base58.decode(sourcePrivateKey.trim());
        const sourceWallet = Keypair.fromSecretKey(decodedKey);

        // Get current balance
        const balance = await connection.getBalance(sourceWallet.publicKey);
        
        // If balance is too low, skip this wallet
        if (balance < 5000) { // 5000 lamports is minimum for transaction fee
            console.log(`Skipping wallet ${sourceWallet.publicKey.toString()} - insufficient balance: ${balance / LAMPORTS_PER_SOL} SOL`);
            return;
        }

        // Calculate amount to send (leave enough for transaction fee)
        const transferAmount = balance - 5000; // Leave 5000 lamports for fee

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: sourceWallet.publicKey,
                toPubkey: destinationPubKey,
                lamports: transferAmount,
            })
        );

        // Get the latest blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = sourceWallet.publicKey;

        // Sign and send the transaction
        const signature = await connection.sendTransaction(transaction, [sourceWallet]);
        
        console.log(`\nTransferred ${transferAmount / LAMPORTS_PER_SOL} SOL from ${sourceWallet.publicKey.toString()}`);
        console.log(`Transaction signature: ${signature}`);
        
        // Wait for confirmation
        await connection.confirmTransaction(signature);
    } catch (error) {
        console.error('Error sweeping SOL:', error.message);
    }
}

async function main() {
    try {
        console.log(`Starting to sweep SOL to ${destinationPubKey.toString()}`);
        console.log(`Found ${sourceKeys.length} wallets to check\n`);

        // Process transfers sequentially
        for (const sourceKey of sourceKeys) {
            await sweepSol(sourceKey);
            // Add a small delay between transactions
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('\nSweep completed!');
    } catch (error) {
        console.error('Error in main process:', error.message);
    }
}

main();