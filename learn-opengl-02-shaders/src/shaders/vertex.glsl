#version 300 es
precision mediump float;

in vec3 aPosition;
in vec3 aColor;

uniform vec3 uOffset;

out vec4 vColor;

void main() {
  gl_Position = vec4(aPosition + uOffset, 1.0);

  vColor = vec4(aColor, 1.0);
}
