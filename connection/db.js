const mysql = require('mysql2');
 
const ConnectionPool = mysql.createPool({
    host :"localhost",
    user: "root",
    password:null,
    database:"bioskop",
});
 

module.exports = ConnectionPool;