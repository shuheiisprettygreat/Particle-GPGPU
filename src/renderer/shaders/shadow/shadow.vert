#version 300 es
precision mediump float;

layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aTex;

uniform mat4 model;
uniform mat4 view;
uniform mat4 proj;
uniform mat4 lightSpaceMatrix;

out vec3 iWorldPos;
out vec3 iNormal;
out vec2 iTex;
out vec4 iFragPosLightSpace;

void main() {
    iWorldPos = vec3(model * vec4(aPos, 1.0));
    iNormal = aNormal;
    iTex = aTex;
    iFragPosLightSpace = lightSpaceMatrix * vec4(iWorldPos, 1.0);

    gl_Position = proj * view * vec4(iWorldPos, 1.0);
}