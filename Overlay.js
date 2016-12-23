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

Overlay.prototype.reticle = function({x = 0, y = 0, dist} = {}){
	let ctx = this.ctx;

	x += this.canvas.width/2;
	y += this.canvas.height/2;

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
		
		let d = Math.round(100*dist)/10;
		ctx.fillText(d+(d == Math.floor(d) ? ".0" : ""), x+28, y+24);
	}
};

Overlay.prototype.labeledValue = function(label, val, format = val){
	let {ctx} = this;
	let lsize = ctx.measureText(label);
	let vsize = ctx.measureText(format);
	let height = 12; //from the font size; measureText sady omits the height

	ctx.fillText(label, 0, 0);
	ctx.rect(lsize.width + 4, 1, vsize.width + 4, height + 1);
	ctx.stroke();
	ctx.fillText(val, lsize.width + 6, 0);
	return {
		width: lsize.width + vsize.width + 8,
		height: height + 2
	};
};

Overlay.prototype.position = function(player){
	let width, height, nh;
	let wtotal = 0;
	let {ctx} = this;

	ctx.save();
	
	({width, height} = this.labeledValue("Position: x:",Math.floor(player.x)+""));
	wtotal += width;

	ctx.translate(width+4,0);
	({width, height:nh} = this.labeledValue("y:",Math.floor(player.y)+""));
	wtotal += width;
	height = Math.max(height, nh);
	
	ctx.translate(width+4,0);
	({width, height:nh} = this.labeledValue("z:",Math.floor(player.z)+""));
	wtotal += width;
	height = Math.max(height, nh);
	
	ctx.translate(width+4,0);
	({width, height:nh} = this.labeledValue("w:",Math.floor(player.w)+""));
	wtotal += width;
	height = Math.max(height, nh);
	
	ctx.restore();

	return {
		width: wtotal + 12,
		height: height
	};
};

Overlay.prototype.orientation = function(player){
	let width, height, nh;
	let wtotal = 0;
	let {fwd} = player;
	let {ctx} = this;
	
	ctx.save();	

	({width, height} = this.labeledValue("Orientation: x:",get_angle(fwd.x)+"","000"));
	wtotal += width;

	ctx.translate(width+4,0);
	({width, height:nh} = this.labeledValue("y:",get_angle(fwd.y)+"","000"));
	wtotal += width;
	height = Math.max(height, nh);
	
	ctx.translate(width+4,0);
	({width, height:nh} = this.labeledValue("z:",get_angle(fwd.z)+"","000"));
	wtotal += width;
	height = Math.max(height, nh);
	
	ctx.translate(width+4,0);
	({width, height:nh} = this.labeledValue("w:",get_angle(fwd.w)+"","000"));
	wtotal += width;
	height = Math.max(height, nh);
	
	ctx.restore();

	return {
		width: wtotal + 12,
		height: height
	};
};

Overlay.prototype.tick = function(player, covered, seconds){
	let {canvas, ctx, fpsw, len} = this;
	let {height, width} = canvas;

	if(fpsw.length > 20){ fpsw.shift(); }
	fpsw.push(1/seconds);

	let fps = fpsw.reduce(function(a,n){ return a + n; })/fpsw.length;
	fps = Math.round(fps*10)/10;
	
	ctx.clearRect(0,0,width,height);
	ctx.font = "10px Calibri";
	ctx.fillStyle = "#FFFFFF";
	ctx.fillText("FPS: "+fps+(fps == Math.floor(fps) ? ".0":""), 5, 10);
	
	// Draw panel
	ctx.beginPath();
	ctx.moveTo(0, height);
	ctx.lineTo(0, height - 50);
	ctx.lineTo(200, height - 50);
	ctx.arcTo(240, height - 50, 240, height - 10, 40);
	ctx.lineTo(240, height);
	ctx.closePath();
	ctx.fillStyle = "#0f0f0f";
	ctx.fill();

	ctx.save();
	
	ctx.font = "12px Calibri";
	ctx.textBaseline = "top";
	ctx.fillStyle = "#02CC02";
	ctx.strokeStyle = "#02CC02";
	ctx.lineWidth = 1;
	ctx.translate(5, height - 48);
	
	let lh;
	({height:lh} = this.position(player));
	ctx.translate(0, lh+2);
	({height:lh} = this.orientation(player));
	ctx.translate(0, lh+2);
	this.labeledValue("Progress:",Math.round(100*covered/len)+"%");
	ctx.restore();
}

module.exports = Overlay;