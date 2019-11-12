const express = require('express');
const cors = require('cors'); //when the clients aren't on the server
const app = express(); //server-app
const bcrypt = require('bcrypt'); //Hashtagger haha, passordet
const pg = require('pg');
const crypto = require('crypto');

const dbURI = "postgres://mrculhchcipczd:fc7107e2a5205045f559d12c831331516f7418db9a359b8732f92c1087aa0c79@ec2-54-217-235-87.eu-west-1.compute.amazonaws.com:5432/d5ltmt8lskihj" + "?ssl=true";
const connstring  = process.env.DATABASE_URL || dbURI;
const pool = new pg.Pool({ connectionString: connstring });


// middleware ------------------------------------
app.use(cors()); //allow all CORS requests
app.use(express.json()); //for extracting json in the request-body
app.use('/', express.static('client')); //for serving client files



// ----------------------TRAVEL----------------------

// endpoint - travel GET ----------------------------
app.get('/travel', async function (req, res) {
    
    let sql = 'SELECT * FROM travel';
    try {
        let result = await pool.query(sql);
        res.status(200).json(result.rows); //send response   
    }  
    catch(err) {
        res.status(500).json({error: err});
    }
});

// endpoint - travel POST ---------------------------
app.post('/travel', async function (req, res) {
   
    let updata = req.body; //the data sent from the client
    
    let sql = "INSERT INTO travel (id, destination, date, km, description, userid) VALUES(DEFAULT, $1, $2, $3, $4, $5) RETURNING *";
    let values = [updata.dest, updata.date, updata.km, updata.descr, updata.userid];


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

//endpint - travels DELETE ---------------------------
app.delete('/travel', async function (req, res) {
    
    let updata = req.body; //the data sent from the client

    let sql = 'DELETE FROM travel WHERE id = $1 RETURNING *';
    let values = [updata.travelID];

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

//--------------------EXPENSE-------------------------

// endpoint - expense POST ---------------------------
app.post('/expenses', async function (req, res) {
    let updata = req.body; //the data sent from the clinet

    let sql = 'INSERT INTO expenses (id, description, amount, travelid) VALUES(DEFAULT, $1, $2, $3) RETURNING *';
    let values = [updata.descr, updata.amount, updata.travelid];

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

// endpoint - expenses GET ----------------------------
app.get('/expenses', async function (req, res) {

    let travelid = req.query.travelid; // the data sent from the client
    
    let sql = 'SELECT * FROM expenses WHERE travelid= $1';
    let values = [travelid];

    try {
        let result = await pool.query(sql, values);
        res.status(200).json(result.rows); //send response
    }
    catch(err) {
        res.status(500).json({error: err}); //send error respons
    }
});

//endpoint - expenses DELETE ---------------------------
app.delete('/expenses', async function (req, res) {
    
    let updata = req.body; //the data sent from the client 

    let sql = 'DELETE FROM expenses WHERE id = $1 RETURNING *';
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


// start server -----------------------------------
var port = process.env.PORT || 3000;
app.listen(port, function () {
    console.log('Server listening on port 3000!');
});

