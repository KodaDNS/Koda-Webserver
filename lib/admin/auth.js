import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FilePath = path.resolve(__dirname, '../../storage/accounts.json');

export function AdminAuth(data, callback) {
    try {
        if (!fs.existsSync(FilePath)) return callback({ success: false, message: 'Storage not found' });
        
        const accounts = JSON.parse(fs.readFileSync(FilePath, 'utf8'));
        let AccountID;
        let user;

        if (data.token) {
            AccountID = Object.keys(accounts).find(key => accounts[key].session === data.token);
            if (AccountID) user = accounts[AccountID];
        } else {
            AccountID = Object.keys(accounts).find(key => 
                accounts[key].username === data.user && accounts[key].role === data.type
            );
            
            if (AccountID && accounts[AccountID].password === data.pass) {
                user = accounts[AccountID];
                user.session = crypto.randomBytes(32).toString('hex');
                user.last_login = new Date().toISOString();
                fs.writeFileSync(FilePath, JSON.stringify(accounts, null, 2));
            }
        }

        if (!user) return callback({ success: false, message: 'Auth failed' });

        callback({ 
            success: true, 
            token: user.session, 
            role: user.role, 
            username: user.username 
        });

    } catch (err) {
        console.error('Auth Error:', err);
        callback({ success: false, message: 'Server error' });
    }
}