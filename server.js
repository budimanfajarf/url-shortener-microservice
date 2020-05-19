'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
const dns = require('dns');

var cors = require('cors');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true }, function(error) {
  if (error)
    console.log(error);
  else
    console.log('connected to mongo ...');
}); 

var Schema = mongoose.Schema;

var urlShcema = new Schema({
  no: Number,
  originalUrl: String,
  shortUrl: String,
});

var Url = mongoose.model('Url', urlShcema);

var createAndSaveShortUrl = function (originalUrl, done) {
  let no = 1;
  Url.findOne().sort('-no').exec(function(err, result) {
    if (result)
      no = result.no + 1;
      
    let shortUrl = new Url({
      no: no, 
      originalUrl: originalUrl, 
      shortUrl: '/api/shorturl/'+no
    });    
    
    shortUrl.save(function(err, result) {
      if (err)
        done(err);
      done(null, result);
    });     
  });
}

var findUrlByNo = function(no, done) {
 Url.findOne({no: no}, function(err, result) {
   if (err)
    done(err);
   done(null, result);
 });
};

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({extended: false}));

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

app.post('/api/shorturl/new', function (req, res) {  
  let originalUrl = req.body.url;
  // let host = new URL(originalUrl).host;
  let host = originalUrl.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0];
  
  
  dns.lookup(host, { all: true }, (err, addresses) => {
    if (err)
      return res.json({"error":"invalid URL"});
    
    // console.log(addresses);
    // return res.json({addresses: addresses});
    
    createAndSaveShortUrl(originalUrl, (err, result) => {
      if (err)
        return res.json({error: "Server Error"});
      
      res.json({ shortUrl: result.shortUrl, originalUrl: result.originalUrl });
    });    
    
  }); 
});

app.get('/api/shorturl/:no?', (req, res) => {
  let no = req.params.no;
  
  if (!no)
    return res.redirect('/');
  
  findUrlByNo(no, (err, result) => {
    if (err)
      return res.json({"error":"Server Error"});
    
    console.log(result);
    res.redirect(result.originalUrl);
  });
});

app.listen(port, function () {
  console.log('Node.js listening ...');
});