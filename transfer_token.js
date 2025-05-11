const fs = require('fs');
const { Connection, Keypair, PublicKey, Transaction, SystemProgram } = require('@solana/web3.js');
const { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction } = require('@solana/spl-token');
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

// Parse main wallet private key and token details from .env
const mainWalletKey = base58.decode(process.env.MAIN_ADDRESS);
const tokenMint = new PublicKey(process.env.TOKEN_ADDRESS);
const tokenAmount = parseFloat(process.env.ADDRESS_TOKEN_AMOUNT);

async function checkAndCreateTokenAccount(owner, payer) {
    const associatedTokenAddress = await getAssociatedTokenAddress(
        tokenMint,
        owner,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Check if account exists
    const account = await connection.getAccountInfo(associatedTokenAddress);
    
    if (!account) {
        console.log('Creating token account...');
        const transaction = new Transaction().add(
            createAssociatedTokenAccountInstruction(
                payer.publicKey,
                associatedTokenAddress,
                owner,
                tokenMint,
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            )
        );

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = payer.publicKey;

        const signature = await connection.sendTransaction(transaction, [payer]);
        await connection.confirmTransaction(signature);
        console.log('Token account created!');
    }

    return associatedTokenAddress;
}

async function transferToken(destinationKey) {
    try {
        const mainWallet = Keypair.fromSecretKey(mainWalletKey);
        const decodedDestKey = base58.decode(destinationKey.trim());
        const destinationWallet = Keypair.fromSecretKey(decodedDestKey);

        // Get or create the source token account
        const sourceAccount = await checkAndCreateTokenAccount(mainWallet.publicKey, mainWallet);

        // Get or create the destination token account
        const destinationAccount = await checkAndCreateTokenAccount(destinationWallet.publicKey, mainWallet);

        // Ensure destination token account exists
        const destinationTokenAccount = await getAssociatedTokenAddress(
            tokenMint,
            destinationWallet.publicKey,
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        const destinationAccountInfo = await connection.getAccountInfo(destinationTokenAccount);
        if (!destinationAccountInfo) {
            console.log('Creating token account for destination wallet...');
            const createAccountTransaction = new Transaction().add(
                createAssociatedTokenAccountInstruction(
                    mainWallet.publicKey,
                    destinationTokenAccount,
                    destinationWallet.publicKey,
                    tokenMint
                )
            );

            const { blockhash } = await connection.getLatestBlockhash();
            createAccountTransaction.recentBlockhash = blockhash;
            createAccountTransaction.feePayer = mainWallet.publicKey;

            const createAccountSignature = await connection.sendTransaction(createAccountTransaction, [mainWallet]);
            await connection.confirmTransaction(createAccountSignature);
            console.log('Token account created successfully.');
        }

        // Create transfer instruction
        const transferInstruction = createTransferInstruction(
            sourceAccount,
            destinationAccount,
            mainWallet.publicKey,
            tokenAmount * Math.pow(10, 8) // PAWS token has 8 decimals
        );

        const transaction = new Transaction().add(transferInstruction);

        // Get the latest blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = mainWallet.publicKey;

        // Sign and send the transaction
        const signature = await connection.sendTransaction(transaction, [mainWallet]);
        
        console.log(`\nTransferred ${tokenAmount} PAWS tokens to ${destinationWallet.publicKey.toString()}`);
        console.log(`Transaction signature: ${signature}`);
        
        // Wait for confirmation
        await connection.confirmTransaction(signature);
    } catch (error) {
        console.error('Error transferring tokens:', error.message);
    }
}

async function main() {
    try {
        const mainWallet = Keypair.fromSecretKey(mainWalletKey);
        
        // Get or create main wallet token account
        const mainAccount = await checkAndCreateTokenAccount(mainWallet.publicKey, mainWallet);

        try {
            // Get token account info and balance
            const accountInfo = await connection.getTokenAccountBalance(mainAccount);
            const balance = accountInfo.value.uiAmount;
            const totalNeeded = tokenAmount * destinationKeys.length;

            console.log(`Main wallet PAWS token balance: ${balance}`);
            console.log(`Total PAWS tokens needed: ${totalNeeded}`);

            if (balance < totalNeeded) {
                console.error('Insufficient token balance in main wallet for all transfers');
                process.exit(1);
            }

            console.log(`\nStarting transfers of ${tokenAmount} PAWS tokens to ${destinationKeys.length} wallets...`);
            
            // Process transfers sequentially
            for (const destinationKey of destinationKeys) {
                await transferToken(destinationKey);
                // Add a small delay between transactions
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            console.log('\nAll token transfers completed!');
        } catch (error) {
            if (error.message.includes('could not find account')) {
                console.error('No PAWS tokens found in main wallet. Please make sure you have PAWS tokens in your main wallet.');
            } else {
                throw error;
            }
        }
    } catch (error) {
        console.error('Error in main process:', error.message);
    }
}

main();