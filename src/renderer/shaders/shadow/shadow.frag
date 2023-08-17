#version 300 es
precision mediump float;

in vec3 iWorldPos;
in vec3 iNormal;
in vec2 iTex;
in vec4 iFragPosLightSpace;

uniform sampler2D tex;
uniform sampler2D shadowMap;
uniform vec3 lightDir;
uniform vec3 cameraPos;

out vec4 FragColor;

float calcShadow(){
    vec3 projCoords = iFragPosLightSpace.xyz / iFragPosLightSpace.w;
    projCoords = projCoords * 0.5 + 0.5;

    float layDepth = texture(shadowMap, projCoords.xy).r;
    float currentDepth = projCoords.z;

    float bias = 0.005;

    float shadow = currentDepth-bias > layDepth ? 1.0 : 0.0;

    return shadow;
}

void main() {
    FragColor = texture(tex, iTex);

    vec3 L = normalize(lightDir);
    vec3 N = normalize(iNormal);
    float diff = dot(L, N);
    diff = diff * 0.5 + 0.5;
    diff = diff * diff;
    diff += 0.2;
    diff = min(1.0, diff);

    vec3 V = normalize(cameraPos - iWorldPos.xyz);
    vec3 H = normalize(L + V);
    float spec = max(0.0, dot(H, N));
    spec = pow(spec, 5100.0);

    float shadow = calcShadow();
    FragColor.xyz = (1.0-shadow*0.8) * FragColor.xyz * diff;
    FragColor.xyz += spec * vec3(1,1,1) * (1.0-shadow);
    // FragColor.xyz = vec3(spec);

}