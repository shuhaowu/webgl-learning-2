#version 300 es
precision mediump float;

uniform sampler2D uTexture;

uniform float uLightAmbientStrength;
uniform vec3 uLightColor;

uniform vec3 uLightPosition;

uniform float uLightSpecularStrength;
uniform float uMaterialShininess;
uniform vec3 uCameraPosition; // Can this be derived from the camera matrix?

in vec3 vFragPosition; // This is the position of the current fragment in 3D space
in vec3 vNormal;
in vec2 vUV;

out vec4 fragColor;

void main() {
  vec4 objectColor = texture(uTexture, vUV);
  vec3 norm = normalize(vNormal); // Need to normalize here because interpolation can mess it up?

  vec3 ambientComponent = uLightAmbientStrength * uLightColor;

  vec3 lightDirection = normalize(uLightPosition - vFragPosition);
  float diff = max(dot(norm, lightDirection), 0.0);
  vec3 diffuseComponent = diff * uLightColor;

  vec3 viewDirection = normalize(uCameraPosition - vFragPosition);
  vec3 reflectDirection = reflect(-lightDirection, norm);
  float spec = pow(max(dot(viewDirection, reflectDirection), 0.0), uMaterialShininess);
  vec3 specular = uLightSpecularStrength * spec * uLightColor;

  fragColor = vec4(ambientComponent + diffuseComponent + specular, 1.0) * objectColor;
}
