const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function displayMenu() {
    console.clear();
    console.log('Chọn kiểu chạy:');
    console.log('1.Check balance SOL (private-key-clone.txt) => (balance-SOL.txt)');
    console.log('2.Check balance ADDRESS_TOKEN (private-key-clone.txt) => (balance-token.txt)');
    console.log('3.Gửi SOL với số lượng SOL_AMOUNT ra ví clone (private-key-clone.txt)');
    console.log('4.Gửi ADDRESS_TOKEN với số lượng ADDRESS_TOKEN_AMOUNT ra ví clone (private-key-clone.txt)');
    console.log('5.Gom SOL số lượng ALL => MAIN_ADDRESS');
    console.log('6.Gom ADDRESS_TOKEN với số lượng ADDRESS_TOKEN_AMOUNT => MAIN_ADDRESS');
    console.log('7.Gom ADDRESS_TOKEN với số lượng ALL => MAIN_ADDRESS');
    console.log('8.Close Token Account hoàn trả fee SOL\n');
}

function executeOption(option) {
    try {
        switch (option) {
            case '1':
                console.log('\nĐang kiểm tra số dư SOL...');
                execSync('node check_balance.js', { stdio: 'inherit' });
                break;
            case '2':
                console.log('\nĐang kiểm tra số dư token...');
                execSync('node check_token_balance.js', { stdio: 'inherit' });
                break;
            case '3':
                console.log('\nĐang gửi SOL đến các ví clone...');
                execSync('node transfer_sol.js', { stdio: 'inherit' });
                break;
            case '4':
                console.log('\nĐang gửi token đến các ví clone...');
                execSync('node transfer_token.js', { stdio: 'inherit' });
                break;
            case '5':
                console.log('\nĐang gom SOL về ví chính...');
                execSync('node sweep_sol.js', { stdio: 'inherit' });
                break;
            case '6':
                console.log('\nĐang gom token về ví chính theo số lượng cố định...');
                execSync('node sweep_token.js', { stdio: 'inherit' });
                break;
            case '7':
                console.log('\nĐang gom toàn bộ token về ví chính...');
                execSync('node sweep_all_tokens.js', { stdio: 'inherit' });
                break;
            case '8':
                console.log('\nĐang đóng token account và hoàn trả SOL...');
                execSync('node close_token_accounts.js', { stdio: 'inherit' });
                break;
            default:
                console.log('Lựa chọn không hợp lệ!');
        }
    } catch (error) {
        console.error('Có lỗi xảy ra:', error.message);
    }
}

async function main() {
    while (true) {
        displayMenu();
        
        const answer = await new Promise(resolve => {
            rl.question('Nhập lựa chọn của bạn (1-8) hoặc nhấn Ctrl+C để thoát: ', resolve);
        });

        if (answer >= '1' && answer <= '8') {
            await executeOption(answer);
            
            // Đợi người dùng nhấn Enter trước khi hiện menu lại
            await new Promise(resolve => {
                rl.question('\nNhấn Enter để tiếp tục...', resolve);
            });
        } else {
            console.log('Lựa chọn không hợp lệ! Vui lòng chọn từ 1-8');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

// Bắt sự kiện Ctrl+C để thoát chương trình
rl.on('SIGINT', () => {
    console.log('\nĐang thoát chương trình...');
    rl.close();
    process.exit();
});

main();