import { cancelManagedAnimationFrame, runOnManagedAnimationFrame } from "./utils/ManagedAnimationFrames.js";
import { GLError } from "./utils/gl.js";

import { mat4, type vec3 } from "gl-matrix";
import * as TexturedTrianglesShader from "./shaders/TexturedTriangles/index.js";
import * as UniformColorTrianglesShader from "./shaders/UniformColorTriangles/index.js";
import type { GeometryGLObjects } from "./shaders/types.js";
import type { STL } from "./utils/STL.js";
import { Camera, CameraControllerFPS } from "./utils/camera.js";
import { cubeWithUv } from "./utils/shapes.js";

function randnum(min: number, max: number): number {
  return (max - min) * Math.random() + min;
}

type Cube = {
  modelMatrix: mat4;
  position: vec3;
  rotationAxis: vec3;
  angle: number;
};

type DirectionalLight = {
  modelMatrix: mat4;
  scale: vec3;
  position: vec3;
  color: vec3;
};

export class Renderer {
  #canvas: HTMLCanvasElement;
  #gl: WebGL2RenderingContext;

  #texture: WebGLTexture;

  #triangleProgram: TexturedTrianglesShader.ProgramInfo;
  #texturedTriangleGLObjs: GeometryGLObjects;
  #cubes: Cube[];

  #lightProgram: UniformColorTrianglesShader.ProgramInfo;
  #lightGLObjs: GeometryGLObjects;
  #lights: DirectionalLight[];
  #lightAmbientColor: vec3 = new Float32Array([1.0, 1.0, 1.0]);

  #projectionMatrix: mat4 = mat4.identity(mat4.create()); // todo: move to camera?

  #camera: Camera;
  #cameraController: CameraControllerFPS;

  constructor(canvas: HTMLCanvasElement, textureImage: HTMLImageElement, sphere: STL) {
    this.#canvas = canvas;

    const gl = this.#canvas.getContext("webgl2");
    if (gl == null) {
      throw new GLError("cannot get webgl2 context");
    }

    this.#gl = gl;

    this.#gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.#gl.enable(gl.DEPTH_TEST);

    // WebGL expects texture coordinate system origin to be at the bottom left.
    // When loading from an HTMLImageElement, the image data is origin'ed on
    // the top left. This flips the Y axis and makes it behave correctly.
    this.#gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    // For managed animation frame rendering.
    Object.defineProperty(this.#render, "name", {
      value: "Renderer.render",
    });

    this.#triangleProgram = TexturedTrianglesShader.createProgram(this.#gl);

    // Prepare the triangle program on the GPU
    const { vertices, indices } = cubeWithUv(2, 1, 1);
    this.#texturedTriangleGLObjs = TexturedTrianglesShader.prepareProgram(
      this.#gl,
      this.#triangleProgram,
      vertices,
      indices,
    );

    this.#lightProgram = UniformColorTrianglesShader.createProgram(this.#gl);
    this.#lightGLObjs = UniformColorTrianglesShader.prepareProgram(this.#gl, this.#lightProgram, sphere.vertices);

    // Prepare textures
    this.#texture = this.#prepareTexture(textureImage);

    // Define instances of the cubes
    this.#cubes = [
      {
        modelMatrix: mat4.create(),
        position: new Float32Array([0, 0, 0]),
        rotationAxis: new Float32Array([0.5, 1.0, 1.0]),
        angle: 0,
      },
    ];

    const lightScale = 1 / Math.max(sphere.extent.x.delta, sphere.extent.y.delta, sphere.extent.z.delta) / 2;
    this.#lights = [
      {
        modelMatrix: mat4.create(),
        scale: new Float32Array([lightScale, lightScale, lightScale]),
        position: new Float32Array([5, 2, -10]),
        color: new Float32Array([1, 1, 1]),
      },
    ];

    // for (let i = 0; i < 9; i++) {
    //   this.#cubes.push({
    //     modelMatrix: mat4.create(),
    //     position: new Float32Array([randnum(-2, 2), randnum(-2, 3), randnum(-3, -10)]),
    //     rotationAxis: new Float32Array([randnum(-1, 1), randnum(-1, 1), randnum(-1, 1)]),
    //     angle: 0,
    //   });
    // }

    this.#camera = new Camera(
      new Float32Array([0, 0, 3]),
      new Float32Array([0, 0, -1]),
      new Float32Array([0, 1, 0]),
      45,
    );
    this.#cameraController = new CameraControllerFPS(this.#canvas, this.#camera, 0.003, 0.02);
  }

  start(): void {
    this.#cameraController.start();
    runOnManagedAnimationFrame(this.#render);
  }

  stop(): void {
    cancelManagedAnimationFrame(this.#render);
    this.#cameraController.stop();
  }

  #prepareTexture(img: HTMLImageElement): WebGLTexture {
    const texture = this.#gl.createTexture();
    if (texture == null) {
      throw new GLError("cannot create texture");
    }

    this.#gl.bindTexture(this.#gl.TEXTURE_2D, texture);

    this.#gl.texImage2D(this.#gl.TEXTURE_2D, 0, this.#gl.RGBA, this.#gl.RGBA, this.#gl.UNSIGNED_BYTE, img);
    this.#gl.generateMipmap(this.#gl.TEXTURE_2D);

    this.#gl.bindTexture(this.#gl.TEXTURE_2D, null);
    return texture;
  }

  #render = (dt: number) => {
    this.#update(dt); // TODO: probably not the best place for it to structure like this.
    this.#draw();
  };

  #update(dt: number): void {
    this.#cameraController.update(dt);

    for (const cube of this.#cubes) {
      cube.angle += ((dt / 1000) * 45 * Math.PI) / 180;
      mat4.identity(cube.modelMatrix);
      mat4.translate(cube.modelMatrix, cube.modelMatrix, cube.position);
      mat4.rotate(cube.modelMatrix, cube.modelMatrix, cube.angle, cube.rotationAxis);
      mat4.scale(cube.modelMatrix, cube.modelMatrix, new Float32Array([0.3, 0.3, 0.3]));
    }

    for (const light of this.#lights) {
      mat4.identity(light.modelMatrix);
      mat4.translate(light.modelMatrix, light.modelMatrix, light.position);
      mat4.scale(light.modelMatrix, light.modelMatrix, light.scale);
    }
  }

  #draw(): void {
    this.#updateCanvasSize();
    this.#gl.clear(this.#gl.COLOR_BUFFER_BIT | this.#gl.DEPTH_BUFFER_BIT);

    const cameraMatrix = this.#camera.cameraMatrix();

    // Textured triangle program
    this.#gl.useProgram(this.#triangleProgram.program);
    this.#gl.bindVertexArray(this.#texturedTriangleGLObjs.vao);
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, this.#texture);

    this.#gl.uniformMatrix4fv(this.#triangleProgram.uniforms.uProjectionMatrix, false, this.#projectionMatrix);
    this.#gl.uniformMatrix4fv(this.#triangleProgram.uniforms.uCameraMatrix, false, cameraMatrix);

    this.#gl.uniform1f(this.#triangleProgram.uniforms.uLightAmbientStrength, 0.1);
    this.#gl.uniform3fv(this.#triangleProgram.uniforms.uLightAmbientColor, this.#lightAmbientColor);

    for (const cube of this.#cubes) {
      this.#gl.uniformMatrix4fv(this.#triangleProgram.uniforms.uModelMatrix, false, cube.modelMatrix);
      this.#gl.drawElements(
        this.#texturedTriangleGLObjs.mode,
        this.#texturedTriangleGLObjs.vertexCount,
        this.#gl.UNSIGNED_SHORT,
        0,
      );
    }

    this.#gl.bindTexture(this.#gl.TEXTURE_2D, null); // Is this necessary?
    this.#gl.bindVertexArray(null);
    this.#gl.useProgram(null);

    // uniform color triangle program
    this.#gl.useProgram(this.#lightProgram.program);
    this.#gl.bindVertexArray(this.#lightGLObjs.vao);

    this.#gl.uniformMatrix4fv(this.#lightProgram.uniforms.uProjectionMatrix, false, this.#projectionMatrix);
    this.#gl.uniformMatrix4fv(this.#lightProgram.uniforms.uCameraMatrix, false, cameraMatrix);

    for (const light of this.#lights) {
      this.#gl.uniformMatrix4fv(this.#lightProgram.uniforms.uModelMatrix, false, light.modelMatrix);
      this.#gl.uniform3fv(this.#lightProgram.uniforms.uColor, light.color);
      this.#gl.drawArrays(this.#lightGLObjs.mode, 0, this.#lightGLObjs.vertexCount);
    }

    this.#gl.bindVertexArray(null);
    this.#gl.useProgram(null);
  }

  #updateCanvasSize(): void {
    const width = this.#canvas.clientWidth;
    const height = this.#canvas.clientHeight;

    if (this.#canvas.width !== width || this.#canvas.height !== height) {
      this.#canvas.width = width;
      this.#canvas.height = height;

      // Update viewport when size changes
      this.#gl.viewport(0, 0, width, height);
    }

    mat4.perspective(this.#projectionMatrix, (this.#camera.fov * Math.PI) / 180, width / height, 0.1, 100);
  }
}
