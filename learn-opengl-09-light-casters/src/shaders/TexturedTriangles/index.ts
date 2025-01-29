import fragmentShaderSrc from "./fragment.glsl?raw";
import vertexShaderSrc from "./vertex.glsl?raw";

import { GLError, type ShaderProgramInfo, createShader, linkShaderProgram } from "../../utils/gl.js";
import type { GeometryGLObjects } from "../types.js";

const __attributeNames = ["aPosition", "aNormal", "aUV"] as const;
export type AttributeNameTexturedTriangles = (typeof __attributeNames)[number];
export const ATTRIBUTE_NAMES: ReadonlyArray<AttributeNameTexturedTriangles> = __attributeNames;

const __uniformNames = [
  "uProjectionMatrix",
  "uCameraMatrix",
  "uModelMatrix",
  "uNormalMatrix",
  "uCameraPosition",
  "uLight.direction",
  "uLight.ambient",
  "uLight.diffuse",
  "uLight.specular",
  "uMaterial.shininess",
  "uMaterial.texture",
  "uMaterial.specular",
  "uPointLight.position",
  "uPointLight.ambient",
  "uPointLight.diffuse",
  "uPointLight.specular",
  "uPointLight.constant",
  "uPointLight.linear",
  "uPointLight.quadratic",
] as const;
export type UniformNameTexturedTriangles = (typeof __uniformNames)[number];
export const UNIFORM_NAMES: ReadonlyArray<UniformNameTexturedTriangles> = __uniformNames;

export type ProgramInfo = ShaderProgramInfo<AttributeNameTexturedTriangles, UniformNameTexturedTriangles>;

export function createProgram(gl: WebGL2RenderingContext): ProgramInfo {
  return linkShaderProgram<AttributeNameTexturedTriangles, UniformNameTexturedTriangles>(
    gl,
    createShader(gl, gl.VERTEX_SHADER, vertexShaderSrc),
    createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc),
    ATTRIBUTE_NAMES,
    UNIFORM_NAMES,
  );
}

export function prepareProgram(
  gl: WebGL2RenderingContext,
  program: ProgramInfo,
  vertices: Float32Array,
  indices: Uint16Array,
): GeometryGLObjects {
  const vao = gl.createVertexArray();
  if (vao == null) {
    throw new GLError("cannot create vao");
  }

  const vertexBuffer = gl.createBuffer();
  if (vertexBuffer == null) {
    throw new GLError("cannot create vertex buffer");
  }

  const indexBuffer = gl.createBuffer();
  if (indexBuffer == null) {
    throw new GLError("cannot create index buffer");
  }

  gl.bindVertexArray(vao);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  gl.vertexAttribPointer(program.attributes.aPosition, 3, gl.FLOAT, false, vertices.BYTES_PER_ELEMENT * 8, 0);
  gl.enableVertexAttribArray(program.attributes.aPosition);

  gl.vertexAttribPointer(
    program.attributes.aNormal,
    3,
    gl.FLOAT,
    false,
    vertices.BYTES_PER_ELEMENT * 8,
    vertices.BYTES_PER_ELEMENT * 3,
  );
  gl.enableVertexAttribArray(program.attributes.aNormal);

  gl.vertexAttribPointer(
    program.attributes.aUV,
    2,
    gl.FLOAT,
    false,
    vertices.BYTES_PER_ELEMENT * 8,
    vertices.BYTES_PER_ELEMENT * 6,
  );
  gl.enableVertexAttribArray(program.attributes.aUV);

  gl.bindVertexArray(null);

  // Binding ELEMENT_ARRAY_BUFFER to null will be recorded by the VAO but
  // binding ARRAY_BUFFER to null will not? So let's unbind them after we
  // unbind the VAO?
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return {
    vao,
    vertexBuffer,
    indexBuffer,
    vertexCount: indices.length,
    mode: gl.TRIANGLES,
  };
}
