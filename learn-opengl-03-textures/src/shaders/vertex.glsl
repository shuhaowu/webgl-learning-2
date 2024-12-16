#version 300 es
precision mediump float;

in vec3 aPosition;
in vec2 aUV;

uniform vec3 uOffset;

out vec2 vUV;

void main() {
  gl_Position = vec4(aPosition + uOffset, 1.0);

  vUV = aUV;
}
