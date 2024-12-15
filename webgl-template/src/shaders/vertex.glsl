#version 300 es
precision mediump float;

in vec3 aPosition;

void main() {
  glPosition = vec4(aPosition, 1.0);
}
