/**
 * This was made with a lot of help from:
 * http://www.12devsofxmas.co.uk/post/2012-12-28-day-3-realtime-collaborative-drawing-with-nodejs
 * http://blog.marcon.me/post/31143865164/send-images-through-websockets
 * http://stackoverflow.com/questions/12107346/understanding-input-type-file
 * 
 * This guy made a lot of the same, but I didn't look at his code until I was already done with that
 * http://psitsmike.com/2011/10/node-js-and-socket-io-multiroom-chat-tutorial/
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
var main_office = {
	id: '0',
	name: "office",
};
var office_hall = Array();

// A user connects to the server (opens a socket)
io.sockets.on('connection', function (socket) {

	// Will it work?
	io.sockets.emit('office', {
		type: "Room_List",
		list: office_hall,
		phase: "update_list"
	});


	// from the browser on this socket
	socket.on('chat', function ( data ) {
		var office = getCurrentSocketOffice(socket);
		if(io.sockets.clients(office.name).indexOf(socket) != -1)
		{
			if(data.message != "")
			{
				data.type = "Chat";
				data.user = clients[socket.id].username;
				io.sockets.in(office.name).emit( 'office', data );   
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
		if(io.sockets.clients(office.name).indexOf(socket) != -1)
		{
			if(data.phase!= "")
			{
				data.type = "Draw";
				data.user = clients[socket.id].username;
				//io.sockets.in(office).emit( 'office', data );   
				socket.broadcast.to(office.name).emit( 'office', data);
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
		if(io.sockets.clients(office.name).indexOf(socket) != -1)
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
			socket.set('my_room', office, function(){ socket.get('my_room', function(err, data){console.log("I have logged a new room: "); console.log(data); }) });
			socket.set('my_name', data.user, function(){ socket.get('my_name', function(err, data){console.log("I have logged a new user: "); console.log(data); }) });
			clients[socket.id] = {username: data.user, office: office};
			usernames[data.user] = {socket: socket.id};
			socket.join(office.name);
			socket.emit("office", {
				type: "General",
				message: "User "+data.user+" Registered",
				phase: "register_ok",
			});
			io.sockets.in(office.name).emit("office", {
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
			var socket_id = usernames[data.user].socket;
			var office = getCurrentSocketOffice(socket_id);
			console.log("Trying to kick "+data.user+" with socket id: "+socket_id+" and in office: "+office.name);
			for (var i=0; i < io.sockets.clients(office.name).length;i++)
			{
				var temp_socket = io.sockets.clients(office.name)[i];
				if(temp_socket.id == socket_id)
				{
					console.log("Found the socket! Now kicking it");
					temp_socket.emit('error', { error: "You have been kicked" });
					temp_socket.leave(office.name);
					io.sockets.in(office.name).emit('office',{
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
			socket.broadcast.to(office.name).emit( 'office', data);
		}
		for(var i=0; i < office_hall.length; i++)
		{
			socket.leave(office_hall.name);
		}
	})
});

function register_user(data)
{
	var auth = false;
	if(data.user == "joydragon" && data.pass == "mypass")
	{
		auth = true;
	}
	else if(data.user == "test" && data.pass == "123")
	{
		auth = true;
	}
	else if(data.pass == "room1")
	{
		auth = true;
		return main_office;
	}
	if(auth)
	{
		if(data.office_num == "create")
		{
			return createOffice(data);
			console.log("What to do?");
		}
		else
		{
			if(!isNaN(parseInt(data.office_num)) && data.office_num <= office_hall.length)
			{
				return office_hall[data.office_num - 1];
			}
		}
	}
	return false;
}

function createOffice(owner)
{
	
	var office = 
	{
		'id' : (office_hall.length + 1),
		'name' : owner.user + "'s Office",
		'owner' : owner,
		'attendeees' : Array(owner),
	};
	office_hall.push(office);
	io.sockets.emit('office', {
		type: "Room_List",
		list: office_hall,
		phase: "update_list"
		});
	console.log("Created office");
	console.log(office);
	return office;
}

function isOwner(username, office)
{
	if(office.name == username)
		return true;
	return false;
}

function getCurrentSocketOffice(socket)
{
	//var my_rooms_list = io.sockets.manager.roomClients[socket.id];
	return clients[socket.id].office;
}

