#version 300 es
precision mediump float;

struct MaterialProperty {
  sampler2D texture;
  sampler2D specular;
  float shininess;
};

struct LightProperty {
  vec3 direction;

  vec3 ambient;
  vec3 diffuse;
  vec3 specular;
};

struct PointLightProperty {
  vec3 position;

  vec3 ambient;
  vec3 diffuse;
  vec3 specular;

  float constant;
  float linear;
  float quadratic;
};

uniform vec3 uCameraPosition; // Can this be derived from the camera matrix?

uniform LightProperty uLight;
uniform MaterialProperty uMaterial;
uniform PointLightProperty uPointLight;

in vec3 vFragPosition; // This is the position of the current fragment in 3D space
in vec3 vNormal;
in vec2 vUV;

out vec4 fragColor;

vec3 calcDirectionalLight(LightProperty light, vec3 norm, vec3 viewDir) {
  vec3 lightDir = normalize(-light.direction);
  vec3 reflectDir = reflect(-lightDir, norm);

  vec3 objectColor = vec3(texture(uMaterial.texture, vUV));

  vec3 ambient = light.ambient * objectColor;

  float diff = max(dot(norm, lightDir), 0.0);
  vec3 diffuse = light.diffuse * diff * objectColor;

  float spec = pow(max(dot(viewDir, reflectDir), 0.0), uMaterial.shininess);
  vec3 specular = light.specular * spec * vec3(texture(uMaterial.specular, vUV));

  return ambient + diffuse + specular;
}

vec3 calculatePointLight(PointLightProperty light, vec3 norm, vec3 viewDir) {
  vec3 lightDir = normalize(light.position - vFragPosition);
  vec3 reflectDir = reflect(-lightDir, norm);

  vec3 objectColor = vec3(texture(uMaterial.texture, vUV));

  vec3 ambient = light.ambient * objectColor;

  float diff = max(dot(norm, lightDir), 0.0);
  vec3 diffuse = light.diffuse * diff * objectColor;

  float spec = pow(max(dot(viewDir, reflectDir), 0.0), uMaterial.shininess);
  vec3 specular = light.specular * spec * vec3(texture(uMaterial.specular, vUV));

  float distance = length(light.position - vFragPosition);
  float attenuation = 1.0 / (light.constant + light.linear * distance + light.quadratic * distance * distance);

  ambient *= attenuation;
  diffuse *= attenuation;
  specular *= attenuation;

  return ambient + diffuse + specular;
}

void main() {
  vec3 norm = normalize(vNormal); // Need to normalize here because interpolation can mess it up?
  vec3 viewDir = normalize(uCameraPosition - vFragPosition);

  vec3 dirLightColor = calcDirectionalLight(uLight, norm, viewDir);
  dirLightColor *= 0.0000001;
  vec3 pointLightColor = calculatePointLight(uPointLight, norm, viewDir);

  fragColor = vec4(dirLightColor + pointLightColor, 1.0);
}
