// auth.js - Handles Authentication logic

const CURRENT_USER_KEY = 'wc_current_user';
const SAVED_CREDENTIALS_KEY = 'wc_saved_credentials';

class Auth {
    constructor(storeInstance) {
        this.store = storeInstance;
        this.currentUser = JSON.parse(localStorage.getItem(CURRENT_USER_KEY));

        // Create base admin if no users exist
        if (this.store.getUsers().length === 0) {
            this.store.addUser({
                id: 'admin1',
                email: 'admin@worldcup.com',
                password: 'admin',
                role: 'admin',
                createdAt: new Date().toISOString()
            });
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    login(email, password) {
        const user = this.store.getUserByEmail(email);
        if(!user) throw new Error("אימייל לא נמצא");
        if(user.password !== password) throw new Error("סיסמה שגויה");

        this.currentUser = user;
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
        localStorage.setItem(SAVED_CREDENTIALS_KEY, JSON.stringify({ email, password }));
        return user;
    }

    getSavedCredentials() {
        return JSON.parse(localStorage.getItem(SAVED_CREDENTIALS_KEY) || 'null');
    }

    register(email, password) {
        let user = this.store.getUserByEmail(email);
        if(user) throw new Error("האימייל כבר רשום במערכת. אנא התחבר.");

        user = {
            id: 'u_' + Date.now().toString(),
            email,
            password, // Storing in plain text locally for simplicity
            role: 'user',
            createdAt: new Date().toISOString()
        };

        this.store.addUser(user);
        this.currentUser = user;
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
        localStorage.setItem(SAVED_CREDENTIALS_KEY, JSON.stringify({ email, password }));
        return user;
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem(CURRENT_USER_KEY);
    }
}

window.auth = new Auth(window.store);
