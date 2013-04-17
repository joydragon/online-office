var canvas = document.getElementById("draw");
paper.setup(canvas);

var canvas_path = Array();

// Connect to the Node.js Server
io = io.connect('/');

// console log a message and the events data
io.on('office', function (data) {
    switch(data.type)
    {
	case "General":
		if(data.phase == "register_ok")
		{
			showMainPage();
		}
		else if(data.phase == "register_nok")
		{
			alert(data.message);
			showStartPage();
		}
		else if(data.phase == "announcement")
		{
			writeGeneralMessages("<em>"+data.message+"</em>");
		}
		break;
	case "Room_List":
		if(data.phase == "update_list")
		{
			jQuery("#select_room").children().not("[value=create]").remove();
			for(var i = 0; i < data.list.length; i++)
			{
				var temp_room = data.list[i];
				var option = document.createElement("option");
				jQuery(option).val(temp_room.id).text(temp_room.name);
				jQuery("#select_room").append(option);
			}
		}
		break;
	case "Chat":
		textarea = document.getElementById("text_history");
		if(textarea)
		{
			writeGeneralMessages("<b>"+data.user+":</b> "+ data.message);
		}
		break;
	case "Draw":
		switch(data.phase)
		{
			case "start_draw":
				if(data.tooltype == "pencil")
				{
					canvas_path[data.user] = new paper.Path();
					canvas_path[data.user].strokeColor = data.color;
					canvas_path[data.user].moveTo(data.point);
				}
				paper.view.draw();
			break;
			case "draw":
				if(data.tooltype == "pencil")
				{
					canvas_path[data.user].lineTo(data.point);
				}
				paper.view.draw();
			break;
			case "end_draw":
				if(data.tooltype == "pencil")
				{
					canvas_path[data.user].lineTo(data.point);
				}
				else if(data.tooltype == "circle")
				{
					canvas_path[data.user] = new paper.Path.Oval(data.rect);
					canvas_path[data.user].strokeColor = data.color;
					canvas_path[data.user].smooth();
				}
				paper.view.draw();
			break;
			case "reload_image":
				var image = document.createElement('img');
				image.src = data.dataURL;
				var raster = new paper.Raster(image);
				//raster.position = paper.view.center;
				raster.position = new paper.Point(raster.width/2, raster.height/2);
				raster.fitBounds(paper.view.bounds);
				// Workaround for the raster not ready with the image for the redraw
				setTimeout(function(){paper.view.draw();}, 100);
			break;
			case "clear_canvas":
				clearCanvas();
			break;
		}
		break;
    }
});

io.on('error', function (error)
{
	showStartPage();
	jQuery("button#drawing_clear_canvas").addClass("clicked");
	jQuery("p#text_history").html("");
	clearCanvas();
	clearTextHistory();
	console.log('Error: '+error.error);
});

jQuery(document).ready(function(){
	jQuery(".main_panel").corner();
	showStartPage();

	jQuery("input#register_username").keypress(function(){
		if(event.which == 13)
		{
			jQuery("button#register_submit").click();
		}
	});
	jQuery("input#register_password").keypress(function(){
		if(event.which == 13)
		{
			jQuery("button#register_submit").click();
		}
	});
	jQuery("input#chat_text_input").keypress(function(){
		if(event.which == 13)
		{
			jQuery("button#chat_send_text").click();
		}
	});
	jQuery("input#kick_text_input").keypress(function(){
		if(event.which == 13)
		{
			jQuery("button#kick_send_text").click();
		}
	});
});

// Actions
function tryRegister()
{
	var username_input = jQuery("input#register_username");
	var password_input = jQuery("input#register_password");
	var office = jQuery("select#select_room");
	if(username_input && password_input && office)
	{
		var data = {
			user: username_input.val(), 
			pass: password_input.val(),
			office_num: office.val()
			};
		console.log(data);
		io.emit("register", data);
	}
	
	jQuery("input#register_password").val("");
}

function writeGeneralMessages(message)
{
	my_text = jQuery("#text_history").html();
	my_text += message+"<br/>";
	jQuery("#text_history").html(my_text);
	jQuery("div#div_text_history").scrollTop(jQuery("div#div_text_history").height());
}

function sendData(textinput)
{
	var text = jQuery(textinput);
	io.emit('chat', {message: text.val()});
	text.val("");
}

function drawingTool(type_button)
{
	type_button.siblings().removeClass("selected");
	type_button.addClass("selected");
}

function clearCanvas(emit)
{
	emit = (typeof emit === "undefined") ? false : emit;
	//jQuery("button#drawing_clear_canvas").addClass("clicked");
	if(paper.project.activeLayer.hasChildren())
	{
		paper.project.activeLayer.removeChildren();
		paper.view.draw();
	}
	if(emit)
		io.emit('draw', {phase: "clear_canvas"});
}

function clearTextHistory()
{
	jQuery("#text_history").html("");
}

function showStartPage()
{
	jQuery("div#register").show();
	jQuery("div#room_list").show();
	jQuery("div#drawing").hide();
	jQuery("div#chatting").hide();
}

function showMainPage()
{
	jQuery("div#register").hide();
	jQuery("div#room_list").hide();
	jQuery("div#drawing").show();
	jQuery("div#chatting").show();
}

function loadImage(file_input)
{
	var reader = new FileReader();
	clearCanvas();
	reader.onload = function(evt)
	{
		var image = document.createElement('img');
		image.src = evt.target.result;
		var raster = new paper.Raster(image);
		//raster.position = paper.view.center;
		raster.position = new paper.Point(raster.width/2, raster.height/2);
		raster.fitBounds(paper.view.bounds);
		io.emit('image', { dataURL: evt.target.result });
		// Workaround for the raster not ready with the image for the redraw
		setTimeout(function(){paper.view.draw();}, 100);
	}
	reader.onerror = function(evt)
	{
		console.error("File could not be read! Code " +evt.target.error.code);
	}
	reader.readAsDataURL(file_input.files[0]);
	jQuery(file_input).replaceWith( jQuery(file_input).val("").clone(true) );
}

function kickUser(user)
{
	io.emit('kick', {user: jQuery(user).val()});
}
