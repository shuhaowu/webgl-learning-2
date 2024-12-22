#version 300 es
precision mediump float;

in vec3 aPosition;

uniform mat4 uProjectionMatrix;
uniform mat4 uCameraMatrix;
uniform mat4 uModelMatrix;


void main() {
  gl_Position = uProjectionMatrix * uCameraMatrix * uModelMatrix * vec4(aPosition, 1.0);
}
