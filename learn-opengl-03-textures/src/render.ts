import { cancelManagedAnimationFrame, runOnManagedAnimationFrame } from "./utils/ManagedAnimationFrames.js";
import { GLError, type ShaderProgramInfo, createShader, linkShaderProgram } from "./utils/gl.js";

import fragmentShaderSrc from "./shaders/fragment.glsl?raw";
import vertexShaderSrc from "./shaders/vertex.glsl?raw";

type TriangleModel = {
  vao: WebGLVertexArrayObject;
  vertexBuffer: WebGLBuffer;
  indexBuffer: WebGLBuffer;
  vertexCount: number;
};

const __triangleProgramAttributeNames = ["aPosition", "aUV"] as const;
type TriangleProgramAttributeNames = (typeof __triangleProgramAttributeNames)[number];
const TRIANGLE_PROGRAM_ATTRIBUTE_NAMES: ReadonlyArray<TriangleProgramAttributeNames> = __triangleProgramAttributeNames;

const __triangleProgramUniformNames = ["uOffset", "uTexture"] as const;
type TriangleProgramUniformNames = (typeof __triangleProgramUniformNames)[number];
const TRIANGLE_PROGRAM_UNIFORM_NAMES: ReadonlyArray<TriangleProgramUniformNames> = __triangleProgramUniformNames;

type TriangleProgramInfo = ShaderProgramInfo<TriangleProgramAttributeNames, TriangleProgramUniformNames>;

export class Renderer {
  #canvas: HTMLCanvasElement;
  #gl: WebGL2RenderingContext;

  #texture: WebGLTexture;

  #triangleProgram: TriangleProgramInfo;
  #triangleModel: TriangleModel;

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

    this.#texture = this.#prepareTexture(textureImage);

    this.#triangleModel = this.#prepareTriangle(
      this.#triangleProgram,
      // biome-ignore format:
      new Float32Array([
        0.6, 0.6, 0, // top right position
        1.0, 1.0, // top right uv coordinate

        0.6, 0.3, 0, // bottom right
        1.0, 0.0, // bottom right uv coordinate

        0.3, 0.3, 0, // bottom left
        0.0, 0.0, // bottom left uv coordinate

        0.3, 0.6, 0, // top left
        0.0, 1.0, // top left uv coordinate
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

  #render = () => {
    this.#updateCanvasSize();
    this.#gl.clear(this.#gl.COLOR_BUFFER_BIT | this.#gl.DEPTH_BUFFER_BIT);

    this.#gl.useProgram(this.#triangleProgram.program);
    this.#gl.bindVertexArray(this.#triangleModel.vao);
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, this.#texture);

    this.#gl.uniform3fv(this.#triangleProgram.uniforms.uOffset, new Float32Array([0.1, 0.2, 0.0]));
    this.#gl.drawElements(this.#gl.TRIANGLES, this.#triangleModel.vertexCount, this.#gl.UNSIGNED_SHORT, 0);

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
