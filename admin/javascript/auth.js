let socket;

async function init() {
    try {
        const res = await fetch('./assets/dyn_config.json');
        const config = await res.json();
        socket = io(config.ws_url);

        socket.on('connect', () => {
            document.getElementById('loginbtn').disabled = false;

            const stored = localStorage.getItem('koda_auth');
            if (stored) {
                const { token, expiry } = JSON.parse(stored);

                if (!expiry || new Date().getTime() < expiry) {
                    socket.emit('auth_check', { token });
                } else {
                    localStorage.removeItem('koda_auth');
                }
            }
        });

        socket.on('auth_result', (obj) => {
            if (obj.success) {
                localStorage.setItem('koda_auth', JSON.stringify({
                    token: obj.token,
                    expiry: new Date().getTime() + (document.getElementById('rememberme').checked ? 7 : 1 / 24) * 24 * 60 * 60 * 1000
                }));
                window.location.href = './dash/';
            } else {
                alert('Login failed: ' + obj.message);
            }
        });

        socket.on('check_result', (obj) => {
            if (obj.success) {
                console.log('Session OK, waiting ...')
                window.location.href = './dash/';
            } else {
                localStorage.removeItem('koda_auth');
                console.log('Session invalid. Login');
            }
        });
    } catch (err) {
        console.error('Connection failed:', err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    init();

    document.getElementById('loginbtn').onclick = () => {
        const data = {
            type: document.getElementById('usertype').value,
            user: document.getElementById('username').value,
            pass: document.getElementById('password').value
        };
        socket.emit('auth', data);
    };
});