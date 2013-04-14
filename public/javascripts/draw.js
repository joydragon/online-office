var myPath;
var pathPoints = Array();

// This function is called whenever the user
// clicks the mouse in the view:

function onMouseDown(event) {
	var drawing_type = jQuery("button.selected").text();
	if(drawing_type == "Pencil" || drawing_type == "Line")
	{
		myPath = new Path();
		myPath.add(event.point);
		//pathPoints = Array();
		myPath.strokeColor = 'black';
		io.emit("draw", {
			tooltype: "pencil",
			phase: "start_draw", 
			point: event.point,
			color: "black",
		});
	}
	else if(drawing_type == "Circle")
	{
		myPath = new Path.Oval(new Rectangle(event.point, new Size(1,1)));
		myPath.style = {
			strokeColor: "black",
//			fillColor: "white",
		};
		myPath.start = event.point;
	}

}

function onMouseDrag(event) {
	var drawing_type = jQuery("button.selected").text();
	if(drawing_type == "Pencil")
	{
		//pathPoints.push(event.point);
		myPath.add(event.point);
		io.emit("draw", {
			tooltype: "pencil",
			phase: "draw", 
			point: event.point,
		});
	}
	else if(drawing_type == "Line")
	{
		if(myPath.segments.length == 2)
		{
			myPath.lastSegment.remove();
		}
		if(myPath.segments.length < 2)
		{
			myPath.add(event.point);
/** Dunno if I have to emit this
			io.emit("draw", {
				phase: "draw", 
				point: event.point,
			});
*/
		}
	}
	else if(drawing_type == "Circle")
	{
		var start = myPath.start;
		var rect = new Rectangle(start, event.point);
		myPath.remove();
		myPath = new Path.Oval(rect);
		myPath.style = {strokeColor: "black"};
		myPath.start = start;
//		myPath.fitBounds(new Rectangle(myPath.start, event.point));
//		var temp = new Path.Rectangle(myPath.start, event.point);
	}
}

function onMouseUp(event) {
	var drawing_type = jQuery("button.selected").text();
	if(drawing_type == "Pencil" || drawing_type == "Line")
	{
		myPath.add(event.point);
		io.emit("draw", { 
			tooltype: "pencil",
			phase: "end_draw",
			point: event.point,
		});
	}
	if(drawing_type == "Circle")
	{
		var rect = new Rectangle( myPath.start, event.point );
		console.log(rect);
		myPath.remove();
		myPath = new Path.Oval(rect);
		myPath.style = {strokeColor: "black"};
		io.emit("draw", {
			tooltype: "circle",
			phase: "end_draw",
			rect: rect,
			color: "black",
		});
	}
}
/*
function onFrame(event){
	if(jQuery("button#drawing_clear_canvas.clicked").length > 0 && project.activeLayer.hasChildren()){
		project.activeLayer.removeChildren();
		jQuery("button#drawing_clear_canvas").removeClass("clicked");
	}
}
*/
