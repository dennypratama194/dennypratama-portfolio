// Raymarched d/p tunnel. Ported verbatim from design/generators/tunnel_fs.glsl.
export const TUNNEL_FS = `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uRo;
uniform mat3 uCam;
uniform float uTan;
uniform float uTun;
uniform float uEnd;
uniform vec3 uKey;
uniform vec3 uAccent;
uniform float uSteps;
const float S = 6.4;
const float NM = 13.0;
const float STEP = 0.2617994;
const float gH = 0.17;
const float gR = 0.014;
const float KS = 7.0;
const vec2 V[11] = vec2[11](
  vec2(0.006836,0.999023), vec2(-0.338867,0.850586), vec2(-0.338867,0.313477),
  vec2(-0.674805,0.161133), vec2(-0.674805,-0.510742), vec2(-0.420898,-0.633789),
  vec2(-0.168945,-0.518555), vec2(-0.168945,-0.157227), vec2(-0.333008,-0.227539),
  vec2(-0.499023,-0.127930), vec2(0.006836,0.092773));
float sdPoly(vec2 p) {
  float d = dot(p - V[0], p - V[0]);
  float s = 1.0;
  for (int i = 0, j = 10; i < 11; j = i, i++) {
    vec2 e = V[j] - V[i];
    vec2 w = p - V[i];
    vec2 b = w - e * clamp(dot(w, e) / dot(e, e), 0.0, 1.0);
    d = min(d, dot(b, b));
    bvec3 c = bvec3(p.y >= V[i].y, p.y < V[j].y, e.x * w.y > e.y * w.x);
    if (all(c) || all(not(c))) s *= -1.0;
  }
  return s * sqrt(d);
}
float sdLogo(vec2 p) { return min(sdPoly(p), sdPoly(-p)); }
mat2 rot2(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
// returns distance; id = mark index; lq = local xy; lz = local z
float mapT(vec3 p, out float id, out vec2 lq, out float lz) {
  float fi = clamp(floor(-p.z / S + 0.5), 0.0, NM - 1.0);
  float zl = p.z + fi * S;
  id = fi; lz = zl;
  if (fi > 0.5 && fi < KS - 0.5) {
    lq = p.xy;
    return min(-p.z - gH, p.z + KS * S - gH);
  }
  vec2 q = rot2(fi * STEP) * p.xy;
  lq = q;
  float bz = abs(zl) - gH;
  float d;
  if (bz > 0.6) {
    d = bz;
  } else {
    float d2 = sdLogo(q);
    vec2 w = vec2(d2 + gR, bz + gR);
    d = min(max(w.x, w.y), 0.0) + length(max(w, 0.0)) - gR;
  }
  if (zl < 0.0 && fi < NM - 1.0) d = min(d, S + zl - gH);
  if (zl > 0.0 && fi > 0.0) d = min(d, S - zl - gH);
  return d;
}
float mapD(vec3 p) { float a; vec2 b; float c; return mapT(p, a, b, c); }
vec3 calcNormal(vec3 p) {
  const vec2 k = vec2(1.0, -1.0);
  const float e = 0.0009;
  return normalize(k.xyy * mapD(p + k.xyy * e) + k.yyx * mapD(p + k.yyx * e) + k.yxy * mapD(p + k.yxy * e) + k.xxx * mapD(p + k.xxx * e));
}
float calcAO(vec3 p, vec3 n) {
  float occ = 0.0; float sca = 1.0;
  for (int i = 0; i < 4; i++) { float h = 0.012 + 0.05 * float(i); occ += (h - mapD(p + n * h)) * sca; sca *= 0.7; }
  return clamp(1.0 - 2.0 * occ, 0.0, 1.0);
}
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 ndc = (2.0 * frag - uRes) / uRes.y;
  vec3 rd = normalize(uCam * vec3(ndc * uTan, -1.0));
  vec3 ro = uRo;
  float endZ = -(NM - 1.0) * S - 3.2;
  // bounding cylinder r=1.03 around z axis, z in [endZ+3, gH]
  float t = 0.0;
  float tMax = 80.0;
  vec2 o2 = ro.xy; vec2 d2 = rd.xy;
  float a = dot(d2, d2), b = dot(o2, d2), c = dot(o2, o2) - 1.03 * 1.03;
  bool inside = c < 0.0;
  if (!inside) {
    float disc = b * b - a * c;
    if (disc < 0.0 || a < 1e-6) { t = tMax; } else {
      float sq = sqrt(disc);
      float t0 = (-b - sq) / a;
      float t1 = (-b + sq) / a;
      if (t1 < 0.0) t = tMax; else { t = max(t0, 0.0); tMax = min(tMax, t1); }
    }
  } else if (a > 1e-6) {
    float sq = sqrt(max(b * b - a * c, 0.0));
    tMax = min(tMax, (-b + sq) / a);
  }
  // z planes clip
  if (rd.z < 0.0) {
    float tz = (gH + 0.02 - ro.z) / rd.z; if (tz > t) t = max(t, tz);
    float tz2 = (endZ + 3.0 - gH - 0.05 - ro.z) / rd.z; tMax = min(tMax, max(tz2, 0.0));
  }
  bool hit = false;
  float id = 0.0; vec2 lq = vec2(0.0); float lz = 0.0;
  float md = 1e9; float mt = t;
  int N = int(uSteps);
  for (int i = 0; i < 220; i++) {
    if (i >= N || t >= tMax) break;
    vec3 p = ro + rd * t;
    float d = mapT(p, id, lq, lz);
    if (d < md) { md = d; mt = t; }
    if (d < 0.0004 * max(t, 1.0)) { hit = true; break; }
    t += d * 0.9;
  }
  vec3 col = vec3(0.0);
  float fogT = t;
  if (hit) {
    vec3 p = ro + rd * t;
    vec3 n = calcNormal(p);
    float idh; vec2 qh; float zh;
    mapT(p, idh, qh, zh);
    vec3 alb = vec3(0.82, 0.80, 0.755);
    // key: point light riding with the camera
    vec3 Lp = ro + uKey;
    vec3 L = Lp - p; float ld = length(L); L /= ld;
    float att = 1.0 / (1.0 + 0.02 * ld * ld);
    float ndl = max(dot(n, L), 0.0);
    float hemi = 0.5 + 0.5 * n.y;
    float occ = calcAO(p, n);
    vec3 amb = mix(vec3(0.006), vec3(0.04, 0.039, 0.036), hemi);
    col = alb * (amb + ndl * att * 2.4) * occ;
    // slash walls glow: only the two walls of the channel
    vec2 nrm = vec2(-0.4003, 0.9164);
    vec2 dir = vec2(0.9164, 0.4003);
    float sl = abs(dot(qh, nrm));
    float along = abs(dot(qh, dir));
    float side = smoothstep(0.55, 0.9, 1.0 - abs(n.z));
    float wall = smoothstep(0.11, 0.09, sl) * smoothstep(0.06, 0.075, sl) * smoothstep(0.62, 0.5, along) * side;
    col = mix(col, uAccent * 1.6, wall * 0.85);
    // thin accent rim on the other side faces
    col += uAccent * side * 0.06;
    float vis = idh < 0.5 ? 1.0 : uTun;
    col *= vis;
    float spec = pow(max(dot(reflect(-L, n), -rd), 0.0), 36.0);
    col += vec3(spec) * 0.25 * att * vis;
  }

  // blueprint marks: drawings floating in the tunnel (front and back outlines, faint fill, graph grid)
  vec3 bp = vec3(0.0);
  float tLimit = hit ? t : 1e9;
  float pix = 2.0 * uTan / uRes.y;
  if (abs(rd.z) > 1e-4) {
    for (int j = 1; j < 7; j++) {
      float fj = float(j);
      for (int f = 0; f < 2; f++) {
        float zp = -fj * S + (f == 0 ? gH : -gH);
        float tp = (zp - ro.z) / rd.z;
        if (tp <= 0.0 || tp >= tLimit) continue;
        vec3 pp = ro + rd * tp;
        if (dot(pp.xy, pp.xy) > 1.08) continue;
        vec2 q = rot2(fj * STEP) * pp.xy;
        float d2 = sdLogo(q);
        float lw = pix * tp * 1.25;
        float line = smoothstep(lw, 0.0, abs(d2));
        float inside = step(d2, 0.0);
        vec2 g = abs(fract(q * 8.0 + 0.5) - 0.5) / 8.0;
        float grid = smoothstep(lw * 0.9, 0.0, min(g.x, g.y)) * inside;
        float fogb = exp(-0.03 * tp);
        float w = (f == 0 ? 1.0 : 0.45) * fogb * uTun;
        bp += uAccent * (line * 1.9 + inside * 0.035 + grid * 0.16) * w;
      }
    }
  }
  // end light at the vanishing point
  vec3 toEnd = vec3(0.0, 0.0, endZ) - ro;
  float de = length(toEnd);
  float ang = max(dot(rd, toEnd / de), 0.0);
  vec3 endC = vec3(1.0, 0.97, 0.92) * (pow(ang, 900.0) * 3.0 + pow(ang, 60.0) * 0.16 + pow(ang, 6000.0) * 8.0) * uTun * (1.0 + uEnd * 6.0) / (1.0 + 0.0006 * de * de);
  // fog with distance: to black in the tunnel, but to the end light where the ray points at it, so the far marks
  // dissolve into the white the dive ends in instead of standing in front of it as a dark silhouette
  float fog = exp(-0.028 * fogT);
  if (hit) col = col * mix(0.15, 1.0, fog) + endC * (1.0 - exp(-0.045 * fogT));
  else col += endC;
  col += bp;
  col = mix(col, vec3(1.0, 0.98, 0.95) * 1.4, uEnd * uEnd);
  col = aces(col * 1.05);
  col = pow(col, vec3(1.0 / 2.2));
  vec2 uv = frag / uRes - 0.5;
  col *= 1.0 - 0.5 * dot(uv, uv);
  col = max(col, vec3(0.047, 0.047, 0.043));
  col += (hash(frag + fract(uTime * 0.37) * 91.0) - 0.5) * 0.03;
  fragColor = vec4(col, 1.0);
}`;

