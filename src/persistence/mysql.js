const waitPort = require('wait-port');
const fs = require('fs');
const mysql = require('mysql');

const {
    MYSQL_HOST: HOST,
    MYSQL_HOST_FILE: HOST_FILE,
    MYSQL_USER_NODE: USER,
    MYSQL_USER_FILE: USER_FILE,
    MYSQL_PASSWORD: PASSWORD,
    MYSQL_PASSWORD_FILE: PASSWORD_FILE,
    MYSQL_DB: DB,
    MYSQL_DB_FILE: DB_FILE,
} = process.env;

let pool;

async function init() {
    const host = HOST_FILE ? fs.readFileSync(HOST_FILE) : HOST;
    const user = USER_FILE ? fs.readFileSync(USER_FILE) : USER;
    const password = PASSWORD_FILE ? fs.readFileSync(PASSWORD_FILE) : PASSWORD;
    const database = DB_FILE ? fs.readFileSync(DB_FILE) : DB;
    await waitPort({ host, port: 3306 });

    pool = mysql.createPool({
        connectionLimit: 5,
        host,
        user,
        password,
        database,
    });

    return new Promise((resolve, reject) => {
        pool.query(
            'CREATE TABLE IF NOT EXISTS todo_items (id varchar(36), name varchar(255), completed boolean)',
            (err) => {
                if (err) return reject(err);
                console.log(`Connected to mysql db at host ${HOST}`);
                resolve();
            },
        );
    });
}

async function teardown() {
    return new Promise((resolve, reject) => {
        pool.end((err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

async function getItems() {
    return new Promise((resolve, reject) => {
        pool.query('SELECT * FROM todo_items', (err, rows) => {
            if (err) return reject(err);
            resolve(
                rows.map((item) => {
                    return { ...item, completed: item.completed === 1 };
                }),
            );
        });
    });
}

async function getItem(id) {
    return new Promise((resolve, reject) => {
        pool.query('SELECT * FROM todo_items WHERE id=?', [id], (err, rows) => {
            if (err) return reject(err);
            resolve(
                rows.map((item) => {
                    return { ...item, completed: item.completed === 1 };
                })[0],
            );
        });
    });
}

async function storeItem(item) {
    return new Promise((resolve, reject) => {
        pool.query(
            'INSERT INTO todo_items (id, name, completed) VALUES (?, ?, ?)',
            [item.id, item.name, item.completed ? 1 : 0],
            (err) => {
                if (err) return reject(err);
                resolve();
            },
        );
    });
}

async function updateItem(id, item) {
    return new Promise((resolve, reject) => {
        pool.query(
            'UPDATE todo_items SET name=?, completed=? WHERE id=?',
            [item.name, item.completed ? 1 : 0, id],
            (err) => {
                if (err) return reject(err);
                resolve();
            },
        );
    });
}

async function removeItem(id) {
    return new Promise((resolve, rej) => {
        pool.query('DELETE FROM todo_items WHERE id = ?', [id], (err) => {
            if (err) return rej(err);
            resolve();
        });
    });
}

module.exports = {
    init,
    teardown,
    getItems,
    getItem,
    storeItem,
    updateItem,
    removeItem,
};
