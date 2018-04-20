var express = require('express');
var app = express();
var fs = require('fs');
var Busboy = require('busboy');
var path = require('path');
var _ = require('underscore');

var http = require('http').Server(app);
var io = require('socket.io')(http);







var BPM_FILE = path.join(__dirname, 'bpm.json');

app.use(express.json());
app.use(express.urlencoded());

app.use(express.static(__dirname + '/public'));


app.post('/upload', function(req, res) {
  var busboy = new Busboy({
    headers: req.headers
  });
  console.log(req.headers);
  var fn;
  busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
    fn = filename;
    console.log("filename " + fn);
    file.pipe(fs.createWriteStream(path.join(__dirname, 'upload', filename)));
  });
  busboy.on('finish', function() {
    res.writeHead(200);
    res.end(fn);
  })
  return req.pipe(busboy);
})

app.use('/public', express.static(__dirname + '/public'));
app.use('/upload', express.static(__dirname + '/upload'));
// app.use('/', function(req, res) {
//   var f = req._parsedOriginalUrl.href.substring(1);
//   res.redirect("/?audio=" + f);
// });
app.get('/bpm', function(req, res) {
  var fname = req.query.fname;
  if (!fname) res.send(404);
  fs.readFile(BPM_FILE, function(err, data) {
    res.setHeader('Cache-Control', 'no-cache');
    res.json(JSON.parse(data).filter(function(x) {
      return x.fname == fname;
    })[0]);
  });
})
app.post('/bpm', function(req, res) {
  fs.readFile(BPM_FILE, function(err, data) {
    var bpms = JSON.parse(data);
    if (!req.body) res.send(404);
    // if (bpms.filter(function(x) {
    //     return x.fname == req.body.fname;
    //   }) != []) res.json(bpms).end();
    // else {
      bpms.push(req.body);
      fs.writeFile(BPM_FILE, JSON.stringify(bpms, null, 4), function(err) {
        res.setHeader('Cache-Control', 'no-cache');
        res.json(bpms);
      });
    // }
  });
});


http.listen(3001, function(){
  console.log('listening on *:3001');
});
io.on('connection', function(socket){
  socket.on('kinect', function(msg){
    io.emit('kinect', msg);
    console.log(msg);
  });
});
app.listen(process.env.PORT || 3000);
