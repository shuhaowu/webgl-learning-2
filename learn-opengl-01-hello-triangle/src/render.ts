import { createShader, GLError, linkShaderProgram, type ShaderProgramInfo } from "./utils/gl.js";
import { cancelManagedAnimationFrame, runOnManagedAnimationFrame } from "./utils/ManagedAnimationFrames.js";

import vertexShaderSrc from "./shaders/vertex.glsl?raw";
import fragmentShaderSrc from "./shaders/fragment.glsl?raw";
import fragmentShader2Src from "./shaders/fragment2.glsl?raw";

type TriangleModel = {
  vao: WebGLVertexArrayObject;
  vertexBuffer: WebGLBuffer;
  indexBuffer: WebGLBuffer;
  vertexCount: number;
};

type TriangleProgramAttributeNames = "aPosition";
type TriangleProgramUniformNames = never;
type TriangleProgramInfo = ShaderProgramInfo<TriangleProgramAttributeNames, TriangleProgramUniformNames>;

export class Renderer {
  #canvas: HTMLCanvasElement;
  #gl: WebGL2RenderingContext;

  #triangleProgram: TriangleProgramInfo;
  #triangleProgram2: TriangleProgramInfo;
  #triangleModel: TriangleModel;
  #triangleModel2: TriangleModel;

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

    this.#triangleProgram = linkShaderProgram<TriangleProgramAttributeNames, TriangleProgramUniformNames>(
      this.#gl,
      createShader(this.#gl, this.#gl.VERTEX_SHADER, vertexShaderSrc),
      createShader(this.#gl, this.#gl.FRAGMENT_SHADER, fragmentShaderSrc),
      ["aPosition"],
      [],
    );

    this.#triangleProgram2 = linkShaderProgram<TriangleProgramAttributeNames, TriangleProgramUniformNames>(
      this.#gl,
      createShader(this.#gl, this.#gl.VERTEX_SHADER, vertexShaderSrc),
      createShader(this.#gl, this.#gl.FRAGMENT_SHADER, fragmentShader2Src),
      ["aPosition"],
      [],
    );

    this.#triangleModel = this.#prepareTriangle(
      this.#triangleProgram,
      // biome-ignore format:
      new Float32Array([
        0.5, 0.5, 0, // top right
        0.5, 0.2, 0, // bottom right
        0.2, 0.2, 0, // bottom left
        0.2, 0.5, 0, // top left
      ]),
      // biome-ignore format:
      new Uint16Array([
        0, 1, 3, // first triangle
        1, 2, 3, // second triangle
      ]),
    );

    this.#triangleModel2 = this.#prepareTriangle(
      this.#triangleProgram,
      // biome-ignore format:
      new Float32Array([
        -0.2, -0.2, 0, // top right
        -0.2, -0.5, 0, // bottom right
        -0.5, -0.5, 0, // bottom left
        -0.5, -0.2, 0, // top left
      ]),
      // biome-ignore format:
      new Uint16Array([
        0, 1, 3, // first triangle
        1, 2, 3, // second triangle
      ]),
    );
  }

  start(): void {
    runOnManagedAnimationFrame(this.#render);
  }

  stop(): void {
    cancelManagedAnimationFrame(this.#render);
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

    this.#gl.vertexAttribPointer(program.attributes.aPosition, 3, this.#gl.FLOAT, false, 0, 0);
    this.#gl.enableVertexAttribArray(program.attributes.aPosition);

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

  #render = () => {
    this.#updateCanvasSize();
    this.#gl.clear(this.#gl.COLOR_BUFFER_BIT | this.#gl.DEPTH_BUFFER_BIT);

    this.#gl.useProgram(this.#triangleProgram.program);
    this.#gl.bindVertexArray(this.#triangleModel.vao);
    this.#gl.drawElements(this.#gl.TRIANGLES, this.#triangleModel.vertexCount, this.#gl.UNSIGNED_SHORT, 0);
    this.#gl.bindVertexArray(null);
    this.#gl.useProgram(null);

    this.#gl.useProgram(this.#triangleProgram2.program);
    this.#gl.bindVertexArray(this.#triangleModel2.vao);
    this.#gl.drawElements(this.#gl.TRIANGLES, this.#triangleModel2.vertexCount, this.#gl.UNSIGNED_SHORT, 0);
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
