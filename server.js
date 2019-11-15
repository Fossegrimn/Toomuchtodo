//--------------------------- Version 1.4 ---------------------------------------

const express = require('express');
const cors = require('cors'); //when the clients aren't on the server
const app = express(); //server-app
const bcrypt = require('bcrypt'); //Hashtagger haha, passordet
const pg = require('pg');
const jwt = require('jsonwebtoken');
const secret = "jhgkjhkj";

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

function protectEndpoints(req, res, next){
    
    token = req.headers['authorization'];
    //token = req.query.token;
    

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

// ----------------------lists----------------------

// endpoint - lists GET ----------------------------
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
    
    let sql = "INSERT INTO lists (id, name, date, description, userid) VALUES(DEFAULT, $1, $2, $3, $4) RETURNING *";
    let values = [updata.name, updata.date, updata.descr, updata.userid];


    try {
        let result = await pool.query(sql, values);

        if (result.rows.length > 0) {
            res.status(200).json({msg: "Insert OK"}); //send respons
        }
        else {
            throw "Insert failed";
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
            res.status(200).json({msg: "Delete OK"}); //send respons
        }
        else {
            throw "Delete failed";
        }
    }
    catch {
        res.status(500).json ({error: err}); //send error respons
    }
});

//endpoint - lists UPDATE ---------------------------------

//--------------------items-------------------------

// endpoint - items POST ---------------------------
app.post('/items', async function (req, res) {
    let updata = req.body; //the data sent from the clinet

    let sql = 'INSERT INTO items (id, description, listsid) VALUES(DEFAULT, $1, $2) RETURNING *';
    let values = [updata.descr, updata.listsid];

    try {
        let result = await pool.query(sql, values);

        if (result.rows.length > 0) {
            res.status(200).json({msg: "Insert Good"}); //send respons
        }
        else {
            throw "Insert failed";
        }
    }
    catch(err) {
        res.status(500).json({error: err}); //send error respons
    }
});

// endpoint - items GET ----------------------------
app.get('/items', async function (req, res) {

    let listsid = req.query.listsid; // the data sent from the client
    
    let sql = 'SELECT * FROM items WHERE listsid= $1';
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
    let values = [updata.expenseID];

    try {
        let result = await pool.query(sql, values);

        if (result.rows.length > 0){
            res.status(200).json({msg: "Delete OK"}); //send respons
        }
        else {
            throw "Delete failed";
        }
    }
    catch {
        res.status(500).json ({error: err}); //send error respons
    }
});



//----------------------USERS----------------------

//endpoint - users POST ---------------------------
app.post('/users', async function (req, res) {

    let updata = req.body; //the data from the client

    //hashing the password befor it is stored in the DB
    let hash = bcrypt.hashSync(updata.passwrd, 10);

    
    let sql = 'INSERT INTO users (id, email, pswhash) VALUES(DEFAULT, $1, $2) RETURNING *';
    //let values = ["jsdlfjk@uia.no", "gdfgdfgdf"];

    let values = [updata.email, hash];
    

    try {
        let result = await pool.query(sql, values);

        if (result.rows.length > 0) {
            res.status(200).json({msg: "Insert Good"}); //send respons
        }
        else {
            throw "Insert failed";
        }
    }
    catch(err) {
        res.status(500).json({error: err}); //send error respons
        console.log(err)
    }
});


// endpoint - auth (login) POST -------------------
app.post('/auth', async function (req, res) {

    let updata = req.body; //the data sent from the client

    //get the user from the database
    let sql = 'SELECT * FROM users WHERE email = $1';
    let values = [updata.email];    

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
                res.status(200).json({email: result.rows[0].email, userid: result.rows[0].id, token: tok});
            }
            else {
                res.status(400).json({msg: "Wrong password"});
            }
        }
    }
    catch(err) {
        console.log(err);
        res.status(500).json({error:err}); //send error response
    }
});


//function used for protectiong endpoints----------


// start server -----------------------------------
var port = process.env.PORT || 3000;
app.listen(port, function () {
    console.log('Server listening on port 3000!');
});

