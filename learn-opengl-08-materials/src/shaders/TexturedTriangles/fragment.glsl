#version 300 es
precision mediump float;

struct MaterialProperty {
  sampler2D texture;
  sampler2D specular;
  float shininess;
};

struct LightProperty {
  vec3 position;

  vec3 ambient;
  vec3 diffuse;
  vec3 specular;
};

uniform vec3 uCameraPosition; // Can this be derived from the camera matrix?

uniform LightProperty uLight;
uniform MaterialProperty uMaterial;

in vec3 vFragPosition; // This is the position of the current fragment in 3D space
in vec3 vNormal;
in vec2 vUV;

out vec4 fragColor;

void main() {
  vec3 objectColor = vec3(texture(uMaterial.texture, vUV));
  vec3 norm = normalize(vNormal); // Need to normalize here because interpolation can mess it up?
  vec3 lightDir = normalize(uLight.position - vFragPosition);
  vec3 viewDir = normalize(uCameraPosition - vFragPosition);
  vec3 reflectDir = reflect(-lightDir, norm);

  vec3 ambient = uLight.ambient * objectColor;

  float diff = max(dot(norm, lightDir), 0.0);
  vec3 diffuse = uLight.diffuse * diff * objectColor;

  float spec = pow(max(dot(viewDir, reflectDir), 0.0), uMaterial.shininess);
  vec3 specular = uLight.specular * spec * vec3(texture(uMaterial.specular, vUV));

  fragColor = vec4(ambient + diffuse + specular, 1.0);
}
