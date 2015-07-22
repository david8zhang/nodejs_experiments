var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var AWS = require('aws-sdk');
var s3 = new AWS.S3();
var nicknames = [];
var hot_topics = [];
var glossary = require("glossary");

app.use(express.static(__dirname + '/bower_components'));

app.get('/', function(req, res, next){
	res.sendFile(__dirname + '/index.html');
})


io.on('connection', function(client){
	console.log('Client connected...');

	client.on('new user', function(data, callback){
		if(nicknames.indexOf(data) != -1){
			callback(false);
		} else {
			callback(true);
			client.nickname = data;
			nicknames.push(client.nickname);
			io.sockets.emit('usernames', nicknames);
		}
	});

	client.on('disconnect', function(data){
		if(!client.nickname)
			return;
		else{
			nicknames.splice(nicknames.indexOf(client.nickname), 1); //removes the user
		}
	})

	client.on('join', function(data){
		console.log(data);
		client.emit('messages', 'Hello from Server');
	})

	client.on('messages', function(data){
		//Upload it to the s3 bucket
		var params = {Bucket:'problem-upload', Key: getDateTime().toString() + ".txt", Body: data.comment}
		s3.putObject(params, function(err, data){
			if(err)
				console.log(err)
			else
				console.log("Successfully uploaded data to the bucket!")
		});
		var data_array = data.split(":");
		console.log(data_array);
		var topic = data_array[0];
		var comment = data_array[1];
		if(hot_topics[topic] === null){
			hot_topics[topic] = 1;
		} else {
			hot_topics[topic] += 1; 
		}
		client.emit('broad', {msg: comment, nick: client.nickname, category:topic});
		client.broadcast.emit('broad', {msg:comment, nick:client.nickname, category: topic});
	})
})

function getDateTime(){
	var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return year + ":" + month + ":" + day + ":" + hour + ":" + min + ":" + sec;
}

console.log("server listening on port 4200");
server.listen(4200);