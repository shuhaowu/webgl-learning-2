import { cancelManagedAnimationFrame, runOnManagedAnimationFrame } from "./utils/ManagedAnimationFrames.js";
import { GLError, type ShaderProgramInfo, createShader, linkShaderProgram } from "./utils/gl.js";

import { mat4, vec3 } from "gl-matrix";
import fragmentShaderSrc from "./shaders/fragment.glsl?raw";
import vertexShaderSrc from "./shaders/vertex.glsl?raw";
import { cubeWithUv } from "./utils/shapes.js";

type TriangleModel = {
  vao: WebGLVertexArrayObject;
  vertexBuffer: WebGLBuffer;
  indexBuffer: WebGLBuffer;
  vertexCount: number;
};

const __triangleProgramAttributeNames = ["aPosition", "aUV"] as const;
type TriangleProgramAttributeNames = (typeof __triangleProgramAttributeNames)[number];
const TRIANGLE_PROGRAM_ATTRIBUTE_NAMES: ReadonlyArray<TriangleProgramAttributeNames> = __triangleProgramAttributeNames;

const __triangleProgramUniformNames = ["uProjectionMatrix", "uCameraMatrix", "uModelMatrix", "uTexture"] as const;
type TriangleProgramUniformNames = (typeof __triangleProgramUniformNames)[number];
const TRIANGLE_PROGRAM_UNIFORM_NAMES: ReadonlyArray<TriangleProgramUniformNames> = __triangleProgramUniformNames;

type TriangleProgramInfo = ShaderProgramInfo<TriangleProgramAttributeNames, TriangleProgramUniformNames>;

function randnum(min: number, max: number): number {
  return (max - min) * Math.random() + min;
}

type Cube = {
  modelMatrix: mat4;
  position: vec3;
  rotationAxis: vec3;
  angle: number;
};

export class Renderer {
  #canvas: HTMLCanvasElement;
  #gl: WebGL2RenderingContext;

  #texture: WebGLTexture;

  #triangleProgram: TriangleProgramInfo;
  #triangleModel: TriangleModel;

  #projectionMatrix: mat4 = mat4.identity(mat4.create());
  #cameraMatrix: mat4 = mat4.identity(mat4.create());

  #cubes: Cube[];

  constructor(canvas: HTMLCanvasElement, textureImage: HTMLImageElement) {
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

    this.#triangleProgram = linkShaderProgram<TriangleProgramAttributeNames, TriangleProgramUniformNames>(
      this.#gl,
      createShader(this.#gl, this.#gl.VERTEX_SHADER, vertexShaderSrc),
      createShader(this.#gl, this.#gl.FRAGMENT_SHADER, fragmentShaderSrc),
      TRIANGLE_PROGRAM_ATTRIBUTE_NAMES,
      TRIANGLE_PROGRAM_UNIFORM_NAMES,
    );

    // Prepare textures

    this.#texture = this.#prepareTexture(textureImage);

    // Prepare the triangle program on the GPU

    const { vertices, indices } = cubeWithUv(2, 1, 1);

    this.#triangleModel = this.#prepareTriangle(this.#triangleProgram, vertices, indices);

    // Define instances of the cubes
    this.#cubes = [
      {
        modelMatrix: mat4.create(),
        position: new Float32Array([0, 0, 0]),
        rotationAxis: new Float32Array([0.5, 1.0, 1.0]),
        angle: 0,
      },
    ];

    for (let i = 0; i < 9; i++) {
      this.#cubes.push({
        modelMatrix: mat4.create(),
        position: new Float32Array([randnum(-2, 2), randnum(-2, 3), randnum(-3, -10)]),
        rotationAxis: new Float32Array([randnum(-1, 1), randnum(-1, 1), randnum(-1, 1)]),
        angle: 0,
      });
    }

    mat4.identity(this.#cameraMatrix);
    mat4.translate(this.#cameraMatrix, this.#cameraMatrix, new Float32Array([0, 0, -3]));
  }

  start(): void {
    runOnManagedAnimationFrame(this.#render);
  }

  stop(): void {
    cancelManagedAnimationFrame(this.#render);
  }

  #prepareTexture(img: HTMLImageElement): WebGLTexture {
    const texture = this.#gl.createTexture();
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, texture);

    this.#gl.texImage2D(this.#gl.TEXTURE_2D, 0, this.#gl.RGBA, this.#gl.RGBA, this.#gl.UNSIGNED_BYTE, img);
    this.#gl.generateMipmap(this.#gl.TEXTURE_2D);

    this.#gl.bindTexture(this.#gl.TEXTURE_2D, null);
    return texture;
  }

  #prepareTriangle(program: TriangleProgramInfo, vertices: Float32Array, indices: Uint16Array): TriangleModel {
    const vao = this.#gl.createVertexArray();
    if (vao == null) {
      throw new GLError("cannot create vao");
    }

    const vertexBuffer = this.#gl.createBuffer();
    if (vertexBuffer == null) {
      throw new GLError("cannot create vertex buffer");
    }

    const indexBuffer = this.#gl.createBuffer();
    if (indexBuffer == null) {
      throw new GLError("cannot create index buffer");
    }

    this.#gl.bindVertexArray(vao);

    this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, vertexBuffer);
    this.#gl.bufferData(this.#gl.ARRAY_BUFFER, vertices, this.#gl.STATIC_DRAW);

    this.#gl.bindBuffer(this.#gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    this.#gl.bufferData(this.#gl.ELEMENT_ARRAY_BUFFER, indices, this.#gl.STATIC_DRAW);

    this.#gl.vertexAttribPointer(
      program.attributes.aPosition,
      3,
      this.#gl.FLOAT,
      false,
      5 * vertices.BYTES_PER_ELEMENT,
      0,
    );
    this.#gl.enableVertexAttribArray(program.attributes.aPosition);

    this.#gl.vertexAttribPointer(
      program.attributes.aUV,
      2,
      this.#gl.FLOAT,
      false,
      5 * vertices.BYTES_PER_ELEMENT,
      3 * vertices.BYTES_PER_ELEMENT,
    );
    this.#gl.enableVertexAttribArray(program.attributes.aUV);

    this.#gl.bindVertexArray(null);

    // Binding ELEMENT_ARRAY_BUFFER to null will be recorded by the VAO but
    // binding ARRAY_BUFFER to null will not? So let's unbind them after we
    // unbind the VAO?
    this.#gl.bindBuffer(this.#gl.ELEMENT_ARRAY_BUFFER, null);
    this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, null);

    return {
      vao,
      vertexBuffer,
      indexBuffer,
      vertexCount: indices.length,
    };
  }

  #render = (dt: number) => {
    this.#update(dt); // TODO: probably not the best place for it to structure like this.
    this.#draw();
  };

  #update(dt: number): void {
    for (const cube of this.#cubes) {
      cube.angle += ((dt / 1000) * 45 * Math.PI) / 180;
      mat4.identity(cube.modelMatrix);
      mat4.translate(cube.modelMatrix, cube.modelMatrix, cube.position);
      mat4.rotate(cube.modelMatrix, cube.modelMatrix, cube.angle, cube.rotationAxis);
      mat4.scale(cube.modelMatrix, cube.modelMatrix, new Float32Array([0.3, 0.3, 0.3]));
    }
  }

  #draw(): void {
    this.#updateCanvasSize();
    this.#gl.clear(this.#gl.COLOR_BUFFER_BIT | this.#gl.DEPTH_BUFFER_BIT);

    this.#gl.useProgram(this.#triangleProgram.program);
    this.#gl.bindVertexArray(this.#triangleModel.vao);
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, this.#texture);

    this.#gl.uniformMatrix4fv(this.#triangleProgram.uniforms.uProjectionMatrix, false, this.#projectionMatrix);
    this.#gl.uniformMatrix4fv(this.#triangleProgram.uniforms.uCameraMatrix, false, this.#cameraMatrix);

    for (const cube of this.#cubes) {
      this.#gl.uniformMatrix4fv(this.#triangleProgram.uniforms.uModelMatrix, false, cube.modelMatrix);
      this.#gl.drawElements(this.#gl.TRIANGLES, this.#triangleModel.vertexCount, this.#gl.UNSIGNED_SHORT, 0);
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

      mat4.perspective(this.#projectionMatrix, (45 * Math.PI) / 180, width / height, 0.1, 100);
    }
  }
}
