import { createShader, GLError, linkShaderProgram, type ShaderProgramInfo } from "./utils/gl.js";
import { cancelManagedAnimationFrame, runOnManagedAnimationFrame } from "./utils/ManagedAnimationFrames.js";

import vertexShaderSrc from "./shaders/vertex.glsl?raw";
import fragmentShaderSrc from "./shaders/fragment.glsl?raw";

type TriangleModel = {
  vao: WebGLVertexArrayObject;
  buffer: WebGLBuffer;
  vertexCount: number;
};

type TriangleProgramAttributeNames = "aPosition";
type TriangleProgramUniformNames = never;
type TriangleProgramInfo = ShaderProgramInfo<TriangleProgramAttributeNames, TriangleProgramUniformNames>;

export class Renderer {
  #canvas: HTMLCanvasElement;
  #gl: WebGL2RenderingContext;

  #triangleProgram: TriangleProgramInfo;
  #triangleModel: TriangleModel;

  constructor(canvas: HTMLCanvasElement) {
    this.#canvas = canvas;

    const gl = this.#canvas.getContext("webgl2");
    if (gl == null) {
      throw new GLError("cannot get webgl2 context");
    }

    this.#gl = gl;

    this.#gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.#gl.enable(gl.DEPTH_TEST);

    // For managed animation frame rendering.
    Object.defineProperty(this.#render, "name", {
      value: "Renderer.render",
    });

    this.#triangleProgram = this.#createTriangleProgram();
    this.#triangleModel = this.#prepareTriangle(this.#triangleProgram);
  }

  start(): void {
    runOnManagedAnimationFrame(this.#render);
  }

  stop(): void {
    cancelManagedAnimationFrame(this.#render);
  }

  #createTriangleProgram(): TriangleProgramInfo {
    return linkShaderProgram<TriangleProgramAttributeNames, TriangleProgramUniformNames>(
      this.#gl,
      createShader(this.#gl, this.#gl.VERTEX_SHADER, vertexShaderSrc),
      createShader(this.#gl, this.#gl.FRAGMENT_SHADER, fragmentShaderSrc),
      ["aPosition"],
      [],
    );
  }

  #prepareTriangle(program: TriangleProgramInfo): TriangleModel {
    // biome-ignore format:
    const vertices = new Float32Array([
      -0.5, -0.5, 0,
       0.5, -0.5, 0,
       0.0,  0.5, 0,
    ]);

    const vao = this.#gl.createVertexArray();
    if (vao == null) {
      throw new GLError("cannot create vao");
    }

    const vertexBuffer = this.#gl.createBuffer();
    if (vertexBuffer == null) {
      throw new GLError("cannot create buffer");
    }

    this.#gl.bindVertexArray(vao);

    this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, vertexBuffer);
    this.#gl.bufferData(this.#gl.ARRAY_BUFFER, vertices, this.#gl.STATIC_DRAW);

    this.#gl.vertexAttribPointer(program.attributes.aPosition, 3, this.#gl.FLOAT, false, 0, 0);
    this.#gl.enableVertexAttribArray(program.attributes.aPosition);

    this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, null);
    this.#gl.bindVertexArray(null);

    return {
      vao,
      buffer: vertexBuffer,
      vertexCount: vertices.length / 3,
    };
  }

  #render = () => {
    this.#updateCanvasSize();
    this.#gl.clear(this.#gl.COLOR_BUFFER_BIT | this.#gl.DEPTH_BUFFER_BIT);

    this.#gl.useProgram(this.#triangleProgram.program);
    this.#gl.bindVertexArray(this.#triangleModel.vao);
    this.#gl.drawArrays(this.#gl.TRIANGLES, 0, this.#triangleModel.vertexCount);
    this.#gl.bindVertexArray(null);
    this.#gl.useProgram(null);
  };

  #updateCanvasSize(): void {
    const width = this.#canvas.clientWidth;
    const height = this.#canvas.clientHeight;

    if (this.#canvas.width !== width || this.#canvas.height !== height) {
      this.#canvas.width = width;
      this.#canvas.height = height;

      // Update viewport when size changes
      this.#gl.viewport(0, 0, width, height);

      // Update perspective projection matrix
      // TODO
    }
  }
}
