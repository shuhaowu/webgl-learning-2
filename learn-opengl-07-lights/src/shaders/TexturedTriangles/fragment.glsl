#version 300 es
precision mediump float;

uniform sampler2D uTexture;

uniform float uLightAmbientStrength;
uniform vec3 uLightAmbientColor;

in vec3 vNormal;
in vec2 vUV;

out vec4 fragColor;

void main() {
  vec3 ambient = uLightAmbientStrength * uLightAmbientColor;
  vec4 objectColor = texture(uTexture, vUV);

  fragColor = vec4(ambient, 1.0) * objectColor;
}
