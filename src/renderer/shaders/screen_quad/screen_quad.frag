#version 300 es
precision mediump float;

in vec2 iTex;

out vec4 FragColor;

uniform sampler2D screenTexture;

void main(){
    vec3 col = texture(screenTexture, iTex).xyz;
    // FragColor = vec4(iTex, 0, 1);
    FragColor = vec4(col, 1);
}

