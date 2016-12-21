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

Overlay.prototype.reticle = function({
	x = this.canvas.width/2,
	y = this.canvas.height/2,
	dist
} = {}){
	let ctx = this.ctx;
	ctx.lineWidth = 2;
    ctx.strokeStyle = "#00FF00";
	ctx.beginPath();
    ctx.arc(x, y, 13, 0, 2 * Math.PI, false);
    ctx.arc(x, y, 17, 0, 2 * Math.PI, false);
	ctx.moveTo(x-25, y);
	ctx.lineTo(x-5, y);
	ctx.moveTo(x+25, y);
	ctx.lineTo(x+5, y);
	ctx.moveTo(x, y-25);
	ctx.lineTo(x, y-5);
	ctx.moveTo(x, y+25);
	ctx.lineTo(x, y+5);
    ctx.stroke();

	if(typeof dist == 'number'){
		ctx.beginPath();
    	ctx.moveTo(x+12, y+12);
		ctx.lineTo(x+25, y+25);
		ctx.lineTo(x+55, y+25);
		ctx.stroke();
		
		ctx.font = "15px Calibri";
		ctx.textAlign = "left";
		ctx.textBaseline = "bottom";
		ctx.fillStyle = "#00FF00";
		ctx.fillText(""+Math.round(10*dist), x+28, y+24);
	}
};

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