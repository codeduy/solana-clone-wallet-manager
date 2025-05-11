const fs = require('fs');
const { Connection, Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const base58 = require('bs58');
require('dotenv').config();

// Read destination private keys from file
const privateKeyFile = 'private-key-clone.txt';
if (!fs.existsSync(privateKeyFile)) {
    console.error(`File ${privateKeyFile} not found.`);
    process.exit(1);
}

const destinationKeys = fs.readFileSync(privateKeyFile, 'utf8')
    .split('\n')
    .filter(line => line.trim() !== '');

// Connect to Solana cluster
const connection = new Connection('https://api.mainnet-beta.solana.com');

// Parse main wallet private key and SOL amount from .env
const mainWalletKey = base58.decode(process.env.MAIN_ADDRESS);
const solAmount = parseFloat(process.env.SOL_AMOUNT);
const lamportsAmount = solAmount * LAMPORTS_PER_SOL;

async function transferSol(destinationKey) {
    try {
        const mainWallet = Keypair.fromSecretKey(mainWalletKey);
        const decodedDestKey = base58.decode(destinationKey.trim());
        const destinationWallet = Keypair.fromSecretKey(decodedDestKey);

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: mainWallet.publicKey,
                toPubkey: destinationWallet.publicKey,
                lamports: lamportsAmount,
            })
        );

        // Get the latest blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = mainWallet.publicKey;

        // Sign and send the transaction
        const signature = await connection.sendTransaction(transaction, [mainWallet]);
        
        console.log(`\nTransferred ${solAmount} SOL to ${destinationWallet.publicKey.toString()}`);
        console.log(`Transaction signature: ${signature}`);
        
        // Wait for confirmation
        await connection.confirmTransaction(signature);
    } catch (error) {
        console.error('Error transferring SOL:', error.message);
    }
}

async function main() {
    try {
        // Check main wallet balance first
        const mainWallet = Keypair.fromSecretKey(mainWalletKey);
        const balance = await connection.getBalance(mainWallet.publicKey);
        const totalNeeded = lamportsAmount * destinationKeys.length;
        
        console.log(`Main wallet balance: ${balance / LAMPORTS_PER_SOL} SOL`);
        console.log(`Total SOL needed for transfers: ${totalNeeded / LAMPORTS_PER_SOL} SOL`);
        
        if (balance < totalNeeded) {
            console.error('Insufficient balance in main wallet for all transfers.');
            console.error(`Please deposit at least ${((totalNeeded - balance) / LAMPORTS_PER_SOL).toFixed(3)} SOL into the main wallet (${mainWallet.publicKey.toBase58()}) and try again.`);
            process.exit(1);
        }

        console.log(`\nStarting transfers of ${solAmount} SOL to ${destinationKeys.length} wallets...`);
        
        // Process transfers sequentially
        for (const destinationKey of destinationKeys) {
            await transferSol(destinationKey);
            // Add a small delay between transactions
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('\nAll transfers completed!');
    } catch (error) {
        console.error('Error in main process:', error.message);
    }
}

main();