var GL_Utils = (function(){
	"use strict";

	function error(msg){
		console.error(msg);
	}

	function createProgram(gl, shaders){
		var linked,
			program = gl.createProgram();

		shaders.forEach(function(shader){
			gl.attachShader(program, shader);
		});

		gl.linkProgram(program);

		// Check the link status
		linked = gl.getProgramParameter(program, gl.LINK_STATUS);
		if(!linked){
			error("Error in program linking:" +
				gl.getProgramInfoLog(program));
			gl.deleteProgram(program);
			return null;
		}

		return program;
	}

	function createShader(gl, shaderSource, shaderType) {
		var compiled,
			shader = gl.createShader(shaderType);

		// Load the shader source
		gl.shaderSource(shader, shaderSource);
		gl.compileShader(shader);

		compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

		if(!compiled){
			error("*** Error compiling shader '" + shader + "':" +
				gl.getShaderInfoLog(shader));
			gl.deleteShader(shader);
			return null;
		}

		return shader;
	}

	function loadShaderFromScript(gl, scriptId, shaderType){
		var sourcePromise,
			shaderScript = document.getElementById(scriptId);

		if(!shaderScript){
		  throw ("*** Error: unknown script element" + scriptId);
		}

		if(shaderScript.src){
			sourcePromise = new Promise(function(accept,reject){
				var xhr = new XMLHttpRequest();

				xhr.addEventListener("load", function(){
					accept(this.responseText);
				});

				xhr.addEventListener("error", function(){
					reject(new Error("Failed to load script"));
				});

				xhr.open("GET", shaderScript.src);
				xhr.send();
			});
		}else{
			sourcePromise = Promise.resolve(shaderScript.text);
		}

		if(!shaderType){
			switch(shaderScript.type){
			case "x-shader/x-vertex":
				shaderType = gl.VERTEX_SHADER;
				break;
			case "x-shader/x-fragment":
				shaderType = gl.FRAGMENT_SHADER;
			}
		}
		if(shaderType !== gl.VERTEX_SHADER && shaderType !== gl.FRAGMENT_SHADER){
			throw ("*** Error: unknown shader type");
		}

		return sourcePromise.then(function(source){
			return createShader(gl, source, shaderType);
		});
	}

	function createProgramFromScripts(gl, scriptIds){
		var shaders = scriptIds.map(function(id){
		  return loadShaderFromScript(gl, id);
		});

		return Promise.all(shaders).then(function(shaders){
			return createProgram(gl, shaders);
		});
	}

	function createProgramFromSources(gl, vertices, fragments) {
		var shaders = vertices.map(function(src){
			return createShader(gl, src, gl.VERTEX_SHADER);
		}).concat(fragments.map(function(src){
			return createShader(gl, src, gl.FRAGMENT_SHADER);
		}));

		return createProgram(gl, shaders);
	}

	return {
		createProgram: createProgram,
		createProgramFromScripts: createProgramFromScripts,
		createProgramFromSources: createProgramFromSources,
	};

})();

