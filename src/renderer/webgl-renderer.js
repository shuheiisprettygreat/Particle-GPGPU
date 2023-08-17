import {Shader} from "../Shader.js";
import {Renderer} from "../Renderer.js";
import {Camera} from "../Camera.js";
import {initVAO, initTexture} from "../init-buffers.js";

import {mat3, mat4, vec3} from "gl-matrix";

import vsSource from './shaders/mat1/v.vert?raw';
import fsSource from './shaders/mat1/f.frag?raw';

import skyVsSource from './shaders/skybox_grad/skybox_grad.vert?raw';
import skyFsSource from './shaders/skybox_grad/skybox_grad.frag?raw';

import screenVsSource from './shaders/screen_quad/screen_quad.vert?raw';
import screenFsSource from './shaders/screen_quad/screen_quad.frag?raw';

import simpleDepthVsSource from './shaders/simple_depth/simple_depth.vert?raw';
import simpleDepthFsSource from './shaders/simple_depth/simple_depth.frag?raw';

import debugVsSource from './shaders/debug/debug.vert?raw';
import debugFsSource from './shaders/debug/debug.frag?raw';

import shadowVsSource from './shaders/shadow/shadow.vert?raw';
import shadowFsSource from './shaders/shadow/shadow.frag?raw';

class WebGLRenderer extends Renderer {

    //---------------------------------------

    initScreenFramebuffer(w, h){
        let gl = this.gl;
        let framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        this.textureColorBuffer = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.textureColorBuffer);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, w, h, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.textureColorBuffer, 0);
        const depthBuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        
        return framebuffer;
    }

    constructor(){
        super();

        // setup gl context
        this.gl = this.canvas.getContext("webgl2");
        let gl = this.gl;
        
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        // setup shaders
        this.shader = new Shader(gl, vsSource, fsSource);
        this.skyShader = new Shader(gl, skyVsSource, skyFsSource);
        this.screenShader = new Shader(gl, screenVsSource, screenFsSource);
        this.simpleDepthShader = new Shader(gl, simpleDepthVsSource, simpleDepthFsSource);
        this.debugShader = new Shader(gl, debugVsSource, debugFsSource);
        this.shadowShader = new Shader(gl, shadowVsSource, shadowFsSource);

        this.shadowShader.use();
        this.shadowShader.setInt("tex", 0);
        this.shadowShader.setInt("shadowMap", 1);

        // setup datas
        this.vao = initVAO(gl);
        this.texture = initTexture(gl, {
            checker_gray : "src\\images\\checker2k.png",
            checker_colored : "src\\images\\checker2kC.png"
        });
        
        // setup camera
        this.camera = new Camera(5, 4, 7, 0, 1, 0, 0, 0, 45);
        this.camera.lookAt(0, 0, 0);

        console.log(this.width, this.height);

        // setup canvas-sized framebuffer
        // this.framebuffer = this.initScreenFramebuffer(this.width, this.height);

        // setup depth framebuffer
        this.depthFrameBuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.depthFrameBuffer);

        this.testTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.testTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 2048, 2048, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.testTexture, 0);

        this.depthMap = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.depthMap);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT32F, 2048, 2048, 0, gl.DEPTH_COMPONENT, gl.FLOAT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depthMap, 0);
        gl.drawBuffers([gl.NONE]);
        gl.readBuffer(gl.NONE);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    //---------------------------------------

    init(){

        this.cubeTransforms = []
    
        for(let i=0; i<100; i++){
            let pos = vec3.create();
            vec3.random(pos, 8.0);
            vec3.scale(pos, pos, Math.sqrt(Math.random()));
            pos[1] += 4;
            let rot = vec3.create();
            vec3.random(rot);
            let scale = vec3.create();
            vec3.random(scale, 0.3);
            
            const trans = new Float32Array([pos[0], pos[1], pos[2], rot[0], rot[1], rot[2], scale[0], scale[1], scale[2], Math.random()]);
            this.cubeTransforms.push(trans);
        }
    }

    //---------------------------------------
    OnResize(width, height){
        this.width = width;
        this.height = height;
        this.framebuffer = this.initScreenFramebuffer(width, height);
    }

    //---------------------------------------
    // Main loop function.
    OnFrame(timestamp, timeDelta){

        // process inputs
        super.OnFrame();

        let gl = this.gl;

        const view = this.camera.getViewMatrix();
        const proj = mat4.create();
        mat4.perspective(proj, this.camera.fov * Math.PI / 180.0, this.width/this.height, 0.1, 100.0);

        this.shadowShader.use();
        this.shadowShader.setMat4("proj", proj);
        this.shadowShader.setMat4("view", view);
        this.shadowShader.setInt("tex", 0);
                this.skyShader.use();
        this.skyShader.setMat4("proj", proj);
        let viewTrans = mat4.fromValues(
            view[0], view[1], view[2], 0,
            view[4], view[5], view[6], 0,
            view[8], view[9], view[10], 0,
            0, 0, 0, 1
        );
        this.skyShader.setMat4("view", viewTrans);


        // render scene from light's point of view. ----------------------
        let lightProj = mat4.create();
        let lightView = mat4.create();
        let nearPlane = 1;
        let farPlane = 20.0;
        mat4.ortho(lightProj, -10, 10, -10, 10, nearPlane, farPlane);
        let lightPos = vec3.fromValues(5*Math.sin(this.timestamp/2500.0), 4.0, 5*Math.cos(this.timestamp/2500.0));
        mat4.lookAt(lightView, lightPos, vec3.fromValues(0,0,0), vec3.fromValues(0,1,0));
        let lightSpaceMatrix = mat4.create();
        mat4.multiply(lightSpaceMatrix, lightProj, lightView);

        this.simpleDepthShader.use();
        this.simpleDepthShader.setMat4("lightSpaceMatrix", lightSpaceMatrix);

        this.shadowShader.use();
        this.shadowShader.setVec3("lightDir", lightPos[0], lightPos[1], lightPos[2]);
        this.shadowShader.setVec3("cameraPos", this.camera.pos[0], this.camera.pos[1], this.camera.pos[2]);

        gl.enable(gl.DEPTH_TEST);
        gl.viewport(0, 0, 2048, 2048);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.depthFrameBuffer);
        gl.clearColor(0.1,0.1,0.1,1.0);
            gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
            gl.enable(gl.DEPTH_TEST);
            this.drawScene(this.simpleDepthShader);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        
        // render as normal ----------------------
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        //render background
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.depthMask(false);
        this.skyShader.use();
        this.renderCube();

        // render scene
        gl.depthMask(true);
        this.shadowShader.use();
        this.shadowShader.setMat4("lightSpaceMatrix", lightSpaceMatrix);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.depthMap);
        this.drawScene(this.shadowShader);

        //draw quad plane with default framebuffer
        // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        // gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        // gl.disable(gl.DEPTH_TEST);
        // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // gl.activeTexture(gl.TEXTURE0);
        // gl.bindTexture(gl.TEXTURE_2D, this.textureColorBuffer);
        // this.screenShader.use();
        // this.renderQuad();
        
        // render debug plane
        gl.viewport(0, 0, this.width*0.2, this.width*0.2);
        this.debugShader.use();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.depthMap);
        this.renderQuad();

    }

    // draw geometries with given shader
    drawScene(shader){
        let gl = this.gl;
        let model = mat4.create();
        shader.use();
        
        model = mat4.create();
        mat4.translate(model, model, vec3.fromValues(0, 0, 0));
        mat4.rotate(model, model, 0, vec3.fromValues(0, 1, 0));
        shader.setMat4("model", model);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture.checker_gray);
        this.renderCube();

        model = mat4.create();
        mat4.translate(model, model, vec3.fromValues(1.8, -0.6, 0.6));
        mat4.scale(model, model, vec3.fromValues(0.4, 0.4, 0.4));
        shader.setMat4("model", model);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture.checker_gray);
        this.renderCube();

        this.cubeTransforms.forEach(t => {
            model = mat4.create();
            mat4.translate(model, model, vec3.fromValues(t[0], t[1], t[2]));
            let axis = vec3.fromValues(t[3], t[4], t[5]);
            mat4.rotate(model, model, t[9]*this.timestamp/1000.0, axis);
            mat4.scale(model, model, vec3.fromValues(t[6], t[7], t[8]));
            shader.setMat4("model", model);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.texture.checker_gray);
            this.renderCube();
        });

        model = mat4.create();
        mat4.translate(model, model, vec3.fromValues(0, -1.0, 0));
        mat4.scale(model, model, vec3.fromValues(7, 7, 7));
        shader.setMat4("model", model);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture.checker_colored);
        this.renderPlane();
    }

    renderCube(){
        let gl = this.gl;
        gl.bindVertexArray(this.vao.cube);
        gl.drawArrays(gl.TRIANGLES, 0, 36);
    }

    renderPlane(){
        let gl = this.gl;
        gl.bindVertexArray(this.vao.plane);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    renderQuad(){
        let gl = this.gl;
        gl.bindVertexArray(this.vao.quad);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}

export {WebGLRenderer}