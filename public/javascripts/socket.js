// Connect to the Node.js Server
io = io.connect('/');

// console log a message and the events data
io.on('chat', function (data) {
    console.log( 'socket: browser receives pong (4)', data );
    textarea = document.getElementById("text_history");
    if(textarea)
    {
    	textarea.innerHTML += data.textdata+"\n";
    }
});

io.on('error', function (error)
{
	console.log('Error: '+error.error);
});
