#version 300 es
precision mediump float;

in vec2 iTex;

uniform sampler2D depthMap;

out vec4 FragColor;

void main()
{             
    float depthValue = texture(depthMap, iTex).r;
    FragColor = vec4(vec3(depthValue), 1.0); 
}