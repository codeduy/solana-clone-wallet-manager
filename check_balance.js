const fs = require('fs');
const { Connection, Keypair } = require('@solana/web3.js');
const base58 = require('bs58');

// Read private keys from file
const privateKeyFile = 'private-key-clone.txt';
if (!fs.existsSync(privateKeyFile)) {
    console.error(`File ${privateKeyFile} not found.`);
    process.exit(1);
}

const privateKeys = fs.readFileSync(privateKeyFile, 'utf8').split('\n').filter(line => line.trim() !== '');

// Connect to Solana cluster
const connection = new Connection('https://api.mainnet-beta.solana.com');

// Create a string to store all balance information
let balanceOutput = 'SOL Balance Check Results\n';
balanceOutput += '=====================\n\n';

async function checkSolBalance(privateKey) {
    try {
        const trimmedKey = privateKey.trim();
        const decodedKey = base58.decode(trimmedKey);
        const keypair = Keypair.fromSecretKey(decodedKey);
        const publicKey = keypair.publicKey;

        // Check SOL balance
        const solBalance = await connection.getBalance(publicKey);
        let balanceInfo = `Wallet: ${publicKey.toBase58()}\n`;
        balanceInfo += `SOL Balance: ${solBalance / 1e9} SOL\n\n`;
        
        // Add to output string
        balanceOutput += balanceInfo;
        
        // Also print to console
        console.log(balanceInfo);
    } catch (error) {
        const errorInfo = `Error processing wallet: ${error.message}\n\n`;
        balanceOutput += errorInfo;
        console.error(errorInfo);
    }
}

async function main() {
    console.log('Checking SOL balances for all wallets...');
    for (const privateKey of privateKeys) {
        await checkSolBalance(privateKey);
    }
    
    // Write results to file
    fs.writeFileSync('balance-SOL.txt', balanceOutput);
    console.log('\nSOL balance check completed. Results saved to balance-SOL.txt');
}

main();