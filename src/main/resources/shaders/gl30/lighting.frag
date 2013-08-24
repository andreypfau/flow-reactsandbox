#version 330

in vec2 textureUV;
noperspective in vec3 viewRay;
in vec3 lightPositionView;
in vec3 spotDirectionView;

layout(location = 0) out vec3 outputColor;

uniform sampler2D colors;
uniform sampler2D normals;
uniform sampler2D depths;
uniform sampler2D materials;
uniform sampler2D occlusion;
uniform vec2 projection;
uniform float lightAttenuation;
uniform	float spotCutoff;

float linearizeDepth(in float depth) {
    return projection.y / (depth - projection.x);
}

void main() {
    outputColor = texture(colors, textureUV).rgb;

    vec4 rawNormalView = texture(normals, textureUV);
    if (rawNormalView.a <= 0) {
        return;
    }
    vec3 normalView = normalize(rawNormalView.xyz * 2 - 1);

    vec3 positionView = viewRay * linearizeDepth(texture(depths, textureUV).r);

    vec3 lightDifference = lightPositionView - positionView;
    float lightDistance = length(lightDifference);
    vec3 lightDirection = lightDifference / lightDistance;
    float distanceIntensity = 1 / (1 + lightAttenuation * lightDistance);
    float spotDotLight = dot(spotDirectionView, -lightDirection);
    float normalDotLight = max(0, dot(normalView, lightDirection));

    vec3 material = texture(materials, textureUV).rgb;

    float occlusion = texture(occlusion, textureUV).r;

    float ambientTerm = material.z * occlusion;
    float diffuseTerm = 0;
    float specularTerm = 0;
    if (spotDotLight > spotCutoff) {
        distanceIntensity *= (spotDotLight - spotCutoff) / (1 - spotCutoff);
        diffuseTerm = material.x * distanceIntensity * normalDotLight;
        if (normalDotLight > 0) {
            specularTerm = material.y * distanceIntensity * pow(max(0, dot(reflect(lightDirection, normalView), normalize(viewRay))), 20);
        }
    }

    outputColor *= (diffuseTerm + specularTerm + ambientTerm);
}
