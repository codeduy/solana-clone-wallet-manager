const fs = require('fs');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const base58 = require('bs58');
require('dotenv').config();

const TOKEN_ADDRESS = new PublicKey(process.env.TOKEN_ADDRESS);

// Read private keys from file
const privateKeyFile = 'private-key-clone.txt';
if (!fs.existsSync(privateKeyFile)) {
    console.error(`File ${privateKeyFile} not found.`);
    process.exit(1);
}

const privateKeys = fs.readFileSync(privateKeyFile, 'utf8').split('\n').filter(line => line.trim() !== '');

// Connect to Solana cluster with custom configs
const connection = new Connection('https://api.mainnet-beta.solana.com', {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000,
    httpHeaders: { 'solana-client': 'js/0.0.0-development' }
});

// Create a string to store all balance information
let balanceOutput = 'Token Balance Check Results\n';
balanceOutput += '========================\n\n';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryWithBackoff(fn, maxRetries = 5, initialDelay = 1000) {
    let retries = 0;
    while (true) {
        try {
            return await fn();
        } catch (error) {
            retries++;
            if (retries > maxRetries || !error.message.includes('429')) {
                throw error;
            }
            const delay = initialDelay * Math.pow(2, retries - 1);
            console.log(`Server responded with 429 Too Many Requests. Retrying after ${delay}ms delay...`);
            await sleep(delay);
        }
    }
}

async function checkTokenBalance(privateKey) {
    try {
        const trimmedKey = privateKey.trim();
        const decodedKey = base58.decode(trimmedKey);
        const keypair = Keypair.fromSecretKey(decodedKey);
        const publicKey = keypair.publicKey;

        let balanceInfo = `Wallet: ${publicKey.toBase58()}\n`;

        // Add retry mechanism for token account check
        const tokenAccount = await retryWithBackoff(() => 
            connection.getParsedTokenAccountsByOwner(publicKey, { mint: TOKEN_ADDRESS })
        );
        
        if (tokenAccount.value.length > 0) {
            const balance = tokenAccount.value[0].account.data.parsed.info.tokenAmount;
            balanceInfo += `Token Balance: ${balance.uiAmount} PAWS\n\n`;
        } else {
            balanceInfo += 'No token account found for this wallet\n\n';
        }

        // Add to output string
        balanceOutput += balanceInfo;
        
        // Also print to console
        console.log(balanceInfo);

        // Add delay between checking different wallets
        await sleep(2000);
    } catch (error) {
        const errorInfo = `Error checking token balance: ${error.message}\n\n`;
        balanceOutput += errorInfo;
        console.error(errorInfo);
    }
}

async function main() {
    console.log('Checking token balances for all wallets...');
    
    // Process wallets sequentially with proper delay
    for (const privateKey of privateKeys) {
        await checkTokenBalance(privateKey);
    }
    
    // Write results to file
    fs.writeFileSync('balance-token.txt', balanceOutput);
    console.log('\nToken balance check completed. Results saved to balance-token.txt');
}

main();