//--------------------------- Version 3.2 ---------------------------------------

const express = require('express');
const cors = require('cors'); //when the clients aren't on the server
const app = express(); //server-app
const bcrypt = require('bcrypt'); //Hashtagger haha, passordet
const pg = require('pg');
const jwt = require('jsonwebtoken');
const secret = "n9}rPL$v'v2wm,55hZX<~u:";

const dbURI = "postgres://mrculhchcipczd:fc7107e2a5205045f559d12c831331516f7418db9a359b8732f92c1087aa0c79@ec2-54-217-235-87.eu-west-1.compute.amazonaws.com:5432/d5ltmt8lskihj" + "?ssl=true";
const connstring  = process.env.DATABASE_URL || dbURI;
const pool = new pg.Pool({ connectionString: connstring });

let token;
let logindata;

// middleware ------------------------------------
app.use(cors()); //allow all CORS requests
app.use(express.json()); //for extracting json in the request-body
app.use('/', express.static('client')); //for serving client files
app.use('/lists', protectEndpoints);
app.use('/items', protectEndpoints);

// ----------------------lists----------------------

// endpoint - lists GET ----------------------------
app.get('/lists/shared', async function (req, res) {
    
    let sql = 'SELECT * FROM lists WHERE shared = true';

    console.log(logindata);

    try {
        let result = await pool.query(sql);
        res.status(200).json(result.rows); //send response   
    }  
    catch(err) {
        console.log(err);
        res.status(500).json({error: err});
    }
});

app.get('/lists', async function (req, res) {
    
    let sql = 'SELECT * FROM lists WHERE userid = $1';
    let values = [logindata.userid];


    console.log(logindata);

    try {
        let result = await pool.query(sql, values);
        res.status(200).json(result.rows); //send response   
    }  
    catch(err) {
        console.log(err);
        res.status(500).json({error: err});
    }
});

// endpoint - lists POST ---------------------------
app.post('/lists', async function (req, res) {
   
    let updata = req.body; //the data sent from the client
    
    let sql = "INSERT INTO lists (id, name, description, userid) VALUES(DEFAULT, $1, $2, $3) RETURNING *";
    let values = [updata.name, updata.descr, updata.userid];

    try {
        let result = await pool.query(sql, values);

        if (result.rows.length > 0) {
            res.status(200).json({msg: "List created"}); //send respons
        }
        else {
            throw "Failed creating list";
        }
    }  
    catch(err) {
        console.log(err)
        res.status(500).json({error: err}); //send error respons
    }
   
});

//endpint - lists DELETE ---------------------------
app.delete('/lists', async function (req, res) {
    
    let updata = req.body; //the data sent from the client

    let sql = 'DELETE FROM lists WHERE id = $1 RETURNING *';
    let values = [updata.listsid];

    try {
        let result = await pool.query(sql, values);

        if (result.rows.length > 0){
            res.status(200).json({msg: "List deleted"}); //send respons
        }
        else {
            throw "Failed deleting list";
        }
    }
    catch {
        res.status(500).json ({error: err}); //send error respons
    }
});

//endpoint - lists UPDATE ---------------------------------
app.put('/lists', async function (req, res) {

    let updata = req.body;

    let sql = 'UPDATE lists SET name = $2, shared = $3 WHERE id = $1';
    let values = [updata.id, updata.name, updata.shared];

    try {
        await pool.query(sql, values);

            res.status(200).json({msg: "List updated"}); //send respons
    }
    catch (err){
        res.status(500).json(err); //send error respons
        console.log(err);
    }
});

//--------------------items-------------------------

// endpoint - items POST ---------------------------
app.post('/items', async function (req, res) {
    let updata = req.body; //the data sent from the clinet

    let sql = 'INSERT INTO items (id, name, listsid, tag) VALUES(DEFAULT, $1, $2, $3) RETURNING *';
    let values = [updata.name, updata.listsid, updata.tag];

    try {
        let result = await pool.query(sql, values);

        if (result.rows.length > 0) {
            res.status(200).json({msg: "Item added"}); //send respons
        }
        else {
            throw "Failed to add item";
        }
    }
    catch(err) {
        res.status(500).json({error: err}); //send error respons
    }
});

// endpoint - items GET ----------------------------
app.get('/items', async function (req, res) {

    let listsid = req.query.listsid; // the data sent from the client
    
    let sql = 'SELECT * FROM items WHERE listsid = $1';
    let values = [listsid];

    try {
        let result = await pool.query(sql, values);
        res.status(200).json(result.rows); //send response
    }
    catch(err) {
        res.status(500).json({error: err}); //send error respons
    }
});

//endpoint - items DELETE ---------------------------
app.delete('/items', async function (req, res) {
    
    let updata = req.body; //the data sent from the client 

    let sql = 'DELETE FROM items WHERE id = $1 RETURNING *';
    let values = [updata.itemid];

    try {
        let result = await pool.query(sql, values);

        if (result.rows.length > 0){
            res.status(200).json({msg: "Item deleted"}); //send respons
        }
        else {
            throw "Failed to delete item";
        }
    }
    catch {
        res.status(500).json ({error: err}); //send error respons
    }
});

//endpoint - items UPDATE ---------------------------------
app.put('/items', async function (req, res) {
    
    let updata = req.body;

    let sql = 'UPDATE items SET name = $2, checked = $3, tag = $4 WHERE id = $1 RETURNING *';
    let values = [updata.id, updata.name, updata.checked, updata.tag];
    
    try {
        await pool.query(sql, values);
            res.status(200).json({msg: "Item updated"}); //send respons
    }
    catch (err){
        res.status(500).json(err); //send error respons
        console.log(err);
    }
});


//----------------------USERS----------------------

//endpoint - users POST ---------------------------
app.post('/users', async function (req, res) {

    let updata = req.body; //the data from the client

    //hashing the password befor it is stored in the DB
    let hash = bcrypt.hashSync(updata.passwrd, 10);

    let sql = 'INSERT INTO users (id, username, pswhash) VALUES(DEFAULT, $1, $2) RETURNING *';

    let values = [updata.username, hash];

    try {
        let result = await pool.query(sql, values);

        if (result.rows.length > 0) {
            res.status(200).json({msg: "User created"}); //send respons
        }
        else {
            throw "Insert failed";
        }
    }
    catch(err) {
        res.status(200).json({msg: "Something went wrong"}); //send respons
        res.status(500).json({error: err}); //send error respons
        console.log(err)
    }
});

//endpoint - users PUT ---------------------------
app.put('/users', async function (req, res) {

    let updata = req.body; //the data from the client
    let hash = bcrypt.hashSync(updata.pswhash, 10);

    console.log("logindata server:", logindata);

    let sql1 = 'UPDATE users SET username = $2, pswhash = $3 WHERE id = $1 RETURNING *';
    let sql2 = 'UPDATE users SET username = $2 WHERE id = $1 RETURNING *';
    let sql3 = 'UPDATE users SET pswhash = $2 WHERE id = $1 RETURNING *';
    let values1 = [logindata.userid, updata.username, hash];
    let values2 = [logindata.userid, updata.username];
    let values3 = [logindata.userid, hash];

    if (updata.username != "" && updata.pswhash != "") {
            try {
                await pool.query(sql1, values1);
                res.status(200).json({msg: "Username and password updated!"});
            }
            catch(err) {
                res.status(200).json({msg: "User aldready exists"});
                res.status(500).json({error: err}); //send error respons
                console.log(err)
            }
    } else if (updata.username != "") {
            try {
                await pool.query(sql2, values2);
                res.status(200).json({msg: "Username updated!"});
            }
            catch(err) {
                res.status(200).json({msg: "User aldready exists"});
                res.status(500).json({error: err}); //send error respons
                console.log(err)
            }
    } else if (updata.pswhash != "") {
            try {
                await pool.query(sql3, values3);
                res.status(200).json({msg: "Password updated!"});
            }
            catch(err) {
                res.status(500).json({error: err}); //send error respons
                console.log(err)
            }
    } else if (updata.username == "" && updata.pswhash == "") {
        res.status(200).json({msg: "Input fields empty!"});
    };
});


// endpoint - user DELETE -------------------
app.delete('/users', async function (req, res) {
    
    let updata = req.body; //the data sent from the client
    let sql = 'DELETE FROM users WHERE id = $1 RETURNING *';
    let values = [updata.id];

    try {
        let result = await pool.query(sql, values);

        if (result.rows.length > 0){
            res.status(200).json({msg: "List deleted"}); //send respons
        }
        else {
            throw "Failed deleting list";
        }
    }
    catch {
        console.log("error:", err);
        res.status(500).json ({err}); //send error respons
        
    }
});



// endpoint - auth (login) POST -------------------
app.post('/auth', async function (req, res) {

    let updata = req.body; //the data sent from the client

    //get the user from the database
    let sql = 'SELECT * FROM users WHERE username = $1';
    let values = [updata.username];    

    try {
        let result = await pool.query(sql, values);        

        if (result.rows.length == 0) {
            res.status(400).json({msg: "User doesn´t exist"});
        }
        else {            

            let check = bcrypt.compareSync(updata.passwrd, result.rows[0].pswhash);            

            if (check == true) {
                let payload = {userid: result.rows[0].id};
                let tok = jwt.sign(payload, secret, {expiresIn: "12h"}); //create token
                res.status(200).json({username: result.rows[0].username, userid: result.rows[0].id, token: tok});
            }
            else {
                res.status(400).json({msg: "Wrong username or password"});
            }
        }
    }
    catch(err) {
        console.log(err);
        res.status(500).json({error:err}); //send error response
    }
});

//function used for protectiong endpoints----------
function protectEndpoints(req, res, next){
    
    token = req.headers['authorization'];
    

    if (token) {
        try {
            
            logindata = jwt.verify(token, secret);
            
            next();
        }
        catch (err) {
            res.status(403).json({msg: "Not a valig token"})

        }
    }
    else {
        res.status(403).json({ msg: "No token"});
    }
}

// start server -----------------------------------
var port = process.env.PORT || 8080;
app.listen(port, function () {
    console.log('Server listening on port 8080!');
});

