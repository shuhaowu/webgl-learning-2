#version 300 es
precision mediump float;

uniform vec3 uColor;

in vec3 vNormal;

out vec4 fragColor;

void main() {
  fragColor = vec4(uColor, 1.0);
}
