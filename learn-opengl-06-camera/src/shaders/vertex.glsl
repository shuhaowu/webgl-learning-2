#version 300 es
precision mediump float;

in vec3 aPosition;
in vec2 aUV;

uniform mat4 uProjectionMatrix;
uniform mat4 uCameraMatrix;
uniform mat4 uModelMatrix;

out vec2 vUV;

void main() {
  gl_Position = uProjectionMatrix * uCameraMatrix * uModelMatrix * vec4(aPosition, 1.0);

  vUV = aUV;
}
