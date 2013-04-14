/**
 * This was made with a lot of help from:
 * http://www.12devsofxmas.co.uk/post/2012-12-28-day-3-realtime-collaborative-drawing-with-nodejs
 * http://blog.marcon.me/post/31143865164/send-images-through-websockets
 * http://stackoverflow.com/questions/12107346/understanding-input-type-file
 */

/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
//  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , fs = require('fs');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser("my own secret"));
app.use(express.cookieSession());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

app.configure(function () {
	app.use(express.cookieParser());
	app.use(express.session({secret: 'secret', key: 'express.sid'}));
});

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
//app.get('/users', user.list);

var server = http.createServer(app).listen(app.get('port'));
var io = require('socket.io').listen(server, function() {
	console.log("Express server listening on port " + app.get('port'));
});

var clients = Array();
var usernames = Array();

// This is the office the client will go
var main_office = "office";

// A user connects to the server (opens a socket)
io.sockets.on('connection', function (socket) {

	// from the browser on this socket
	socket.on('chat', function ( data ) {
		var office = getCurrentSocketOffice(socket);
		if(io.sockets.clients(office).indexOf(socket) != -1)
		{
			if(data.message != "")
			{
				data.type = "Chat";
				data.user = clients[socket.id].username;
				io.sockets.in(office).emit( 'office', data );   
			}
		}
		else
		{
			socket.emit("error", {error: "Not registered"});
		}
	});

	// from the browser on this socket
	socket.on('draw', function ( data ) {
		var office = getCurrentSocketOffice(socket);
		if(io.sockets.clients(office).indexOf(socket) != -1)
		{
			if(data.phase!= "")
			{
				data.type = "Draw";
				data.user = clients[socket.id].username;
				//io.sockets.in(office).emit( 'office', data );   
				socket.broadcast.to(office).emit( 'office', data);
			}
		}
		else
		{
			socket.emit("error", {error: "Not registered"});
		}
	});

	// from the browser on this socket
	socket.on('image', function ( data ) {
		var office = getCurrentSocketOffice(socket);
		if(io.sockets.clients(office).indexOf(socket) != -1)
		{
			if(data.phase!= "")
			{
				data.type = "Draw";
				data.phase = "reload_image";
				data.user = clients[socket.id].username;
				socket.broadcast.to(office).emit( 'office', data);
			}
		}
		else
		{
			socket.emit("error", {error: "Not registered"});
		}
	});

	socket.on('register', function ( data ) {
		var office = register_user(data);
		if(office && data.user != "")
		{
			clients[socket.id] = {username: data.user, office: office};
			usernames[data.user] = {socket: socket.id};
			socket.join(office);
			socket.emit("office", {
				type: "General",
				message: "User "+data.user+" Registered",
				phase: "register_ok",
			});
			io.sockets.in(office).emit("office", {
				type: "General",
				message: "User "+data.user+" Registered",
				phase: "announcement",
			});
		}
		else
		{
			socket.emit("office", {
				type: "General",
				message: "I don't know you",
				phase: "register_nok",
			});
		}
	});
	socket.on('kick', function(data){
		if(data.user != undefined && data.user != "" && true) // Last true is for the canHeKickHim? query
		{
			var office = getCurrentOfficeFromUsername(data.user);
			var socket_id = usernames[data.user].socket;
			console.log("Trying to kick "+data.user+" with socket id: "+socket_id+" and in office: "+office);
			for (var i=0; i < io.sockets.clients(office).length;i++)
			{
				var temp_socket = io.sockets.clients(office)[i];
				if(temp_socket.id == socket_id)
				{
					console.log("Found the socket! Now kicking it");
					temp_socket.emit('error', { error: "You have been kicked" });
					temp_socket.leave(office);
					io.sockets.in(office).emit('office',{
						type: "General",
						message: "User "+data.user+" has been kicked",
						phase: "announcement",
					});
				}
			}
		}
	});
	socket.on('disconnect', function(data){
		if(clients[socket.id] != undefined)
		{
			var office = getCurrentSocketOffice(socket);
			data = { 
				type: "General", 
				message: "User: "+clients[socket.id].username+ " has left the chat",
				phase: "announcement",
			}
			usernames[clients[socket.id].username] = undefined;
			clients[socket.id] = undefined;
			socket.broadcast.to(office).emit( 'office', data);
		}
	})
});

function register_user(data)
{
	if(data.user == "joydragon" && data.pass == "mypass")
	{
		return main_office;
	}
	else if(data.user == "test" && data.pass == "123")
	{
		return main_office;
	}
	else if(data.pass == "room1")
	{
		return main_office;
	}
	return false;
}

function isOwner(username, office)
{
	if(office == main_office && username == "joydragon")
		return true;
}

function getCurrentSocketOffice(socket)
{
	var my_rooms_list = io.sockets.manager.roomClients[socket.id];

	

	return main_office;
}

function getCurrentOfficeFromUsername(username)
{
	
	return main_office;
}
