function Overlay(canvas, len){
	this.canvas = canvas;
	this.ctx = canvas.getContext('2d');
	this.fpsw = [];
	this.len = len;
}

Overlay.prototype.resize = function(w,h){
	this.canvas.width = w;
	this.canvas.height = h;
};

function get_angle(c){
	return Math.round(180*Math.acos(c)/Math.PI);
}

Overlay.prototype.tick = function(player, covered, seconds){
	let {canvas, ctx, fpsw, len} = this;

	if(fpsw.length > 20){ fpsw.shift(); }
	fpsw.push(1/seconds);

	let fps = fpsw.reduce(function(a,n){ return a + n; })/fpsw.length;
	fps = Math.round(fps*10)/10;
	
	ctx.clearRect(0,0,canvas.width,canvas.height);
	ctx.font = "10px Calibri";
	ctx.fillStyle = "#FFFFFF";
	ctx.fillText("FPS: "+fps+(fps == Math.floor(fps) ? ".0":""), 5, 10);
	ctx.fillText("Position: x: "+
				Math.floor(player.x)+
				" y: "+Math.round(player.y)+
				" z: "+Math.floor(player.z)+
				" w: "+Math.floor(player.w),
				5, canvas.height - 30);
	ctx.fillText("Orientation: x: "+
				get_angle(player.fwd.x)+
				" y: "+get_angle(player.fwd.y)+
				" z: "+get_angle(player.fwd.z)+
				" w: "+get_angle(player.fwd.w),
				5, canvas.height - 20);
	ctx.fillText("Progress: "+Math.round(100*covered/len)+"%", 5, canvas.height - 10);
}

module.exports = Overlay;